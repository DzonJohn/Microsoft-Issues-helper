const regexInput = document.getElementById("regexText");
const sampleInput = document.getElementById("sampleText");
const sampleHighlight = document.getElementById("sampleHighlight");
const outputInput = document.getElementById("outputText");
const matchCountDigit = document.querySelector(".zero-spinner-digit");
const sampleFileSelect = document.getElementById("sampleFileSelect");
const fallbackSampleFiles = [
	"emails.txt",
	"phone-numbers.txt",
	"sampleData.json",
	"sampleLogPlainText.txt",
	"urls.txt"
];
let latestValidationRequestId = 0;
let validationTimeoutId;

function resetSampleFileOptions() {
	if (!sampleFileSelect) {
		return;
	}

	while (sampleFileSelect.options.length > 1) {
		sampleFileSelect.remove(1);
	}
}

function populateSampleFileOptions(files) {
	if (!sampleFileSelect) {
		return;
	}

	resetSampleFileOptions();

	for (const name of files) {
		const option = document.createElement("option");
		option.value = name;
		option.textContent = name;
		sampleFileSelect.appendChild(option);
	}
}

function setMatchCount(count) {
	if (matchCountDigit) {
		matchCountDigit.textContent = String(count);
	}
}

function parseRegex(patternText) {
	const trimmed = patternText.trim();

	if (!trimmed) {
		return { error: "Enter a regex pattern." };
	}

	// Finds the closing delimiter in /pattern/flags while respecting escaped slashes.
	const findClosingSlashIndex = (value) => {
		for (let i = value.length - 1; i > 0; i -= 1) {
			if (value[i] !== "/") {
				continue;
			}

			let backslashCount = 0;
			for (let j = i - 1; j >= 0 && value[j] === "\\"; j -= 1) {
				backslashCount += 1;
			}

			if (backslashCount % 2 === 0) {
				return i;
			}
		}

		return -1;
	};

	try {
		if (trimmed.startsWith("/")) {
			const closingSlashIndex = findClosingSlashIndex(trimmed);

			if (closingSlashIndex <= 0) {
				return { error: "Invalid regex: Missing closing '/' delimiter." };
			}

			const pattern = trimmed.slice(1, closingSlashIndex);
			const flags = trimmed.slice(closingSlashIndex + 1);

			return { regex: new RegExp(pattern, flags) };
		}

		return { regex: new RegExp(trimmed) };
	} catch (error) {
		return { error: `Invalid regex: ${error.message}` };
	}
}

function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function renderHighlightedSample(sourceText, matches) {
	if (!sampleHighlight) {
		return;
	}

	if (!sourceText) {
		sampleHighlight.innerHTML = "";
		return;
	}

	if (!matches || matches.length === 0) {
		sampleHighlight.innerHTML = escapeHtml(sourceText);
		return;
	}

	let cursor = 0;
	const chunks = [];

	for (const match of matches) {
		const index = typeof match.index === "number" ? match.index : -1;
		const text = typeof match[0] === "string" ? match[0] : "";

		if (index < 0 || index < cursor) {
			continue;
		}

		if (index > cursor) {
			chunks.push(escapeHtml(sourceText.slice(cursor, index)));
		}

		if (text.length > 0) {
			chunks.push(`<span class="regex-hit">${escapeHtml(text)}</span>`);
			cursor = index + text.length;
		}
	}

	if (cursor < sourceText.length) {
		chunks.push(escapeHtml(sourceText.slice(cursor)));
	}

	sampleHighlight.innerHTML = chunks.join("");
}

function syncHighlightScroll() {
	if (!sampleHighlight || !sampleInput) {
		return;
	}

	sampleHighlight.scrollTop = sampleInput.scrollTop;
	sampleHighlight.scrollLeft = sampleInput.scrollLeft;
}

function getLineNumberForIndex(sourceText, index) {
	if (index <= 0) {
		return 1;
	}

	let lineNumber = 1;
	let searchFrom = 0;

	while (searchFrom < index) {
		const newlineIndex = sourceText.indexOf("\n", searchFrom);

		if (newlineIndex === -1 || newlineIndex >= index) {
			break;
		}

		lineNumber += 1;
		searchFrom = newlineIndex + 1;
	}

	return lineNumber;
}

async function validateAndMatch() {
	const requestId = ++latestValidationRequestId;
	const sourceText = sampleInput.value;

	if (!regexInput.value.trim()) {
		setMatchCount(0);
		outputInput.value = "0";
		renderHighlightedSample(sourceText, []);
		return;
	}

	const parsed = parseRegex(regexInput.value);

	if (parsed.error) {
		setMatchCount(0);
		outputInput.value = parsed.error;
		renderHighlightedSample(sourceText, []);
		return;
	}

	const regex = parsed.regex.global
		? parsed.regex
		: new RegExp(parsed.regex.source, `${parsed.regex.flags}g`);

	if (requestId !== latestValidationRequestId) {
		return;
	}

	if (!sourceText.trim()) {
		setMatchCount(0);
		outputInput.value = "0";
		renderHighlightedSample(sourceText, []);
		return;
	}

	const matches = Array.from(sourceText.matchAll(regex));

	if (matches.length === 0) {
		setMatchCount(0);
		outputInput.value = "0";
		renderHighlightedSample(sourceText, []);
		return;
	}

	setMatchCount(matches.length);

	const lineCounts = new Map();

	for (const match of matches) {
		if (typeof match.index !== "number") {
			continue;
		}

		const lineNumber = getLineNumberForIndex(sourceText, match.index);
		lineCounts.set(lineNumber, (lineCounts.get(lineNumber) ?? 0) + 1);
	}

	const lineBreakdown = Array.from(lineCounts.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([lineNumber, count]) => `Line ${lineNumber}: ${count} match${count === 1 ? "" : "es"}`);

	outputInput.value = [
		`Found ${matches.length} match${matches.length === 1 ? "" : "es"}.`,
		...lineBreakdown
	].join("\n");
	renderHighlightedSample(sourceText, matches);
}

function scheduleValidation() {
	clearTimeout(validationTimeoutId);
	validationTimeoutId = setTimeout(() => {
		void validateAndMatch();
	}, 250);
}

// --- Sample data file selector ---

async function loadFileList() {
	if (!sampleFileSelect) {
		return;
	}

	try {
		const response = await fetch("/api/files");

		if (!response.ok) {
			populateSampleFileOptions(fallbackSampleFiles);
			return;
		}

		const files = await response.json();
		const usableFiles = Array.isArray(files) && files.length > 0
			? files
			: fallbackSampleFiles;

		populateSampleFileOptions(usableFiles);
	} catch {
		populateSampleFileOptions(fallbackSampleFiles);
	}
}

async function onSampleFileChange() {
	const fileName = sampleFileSelect ? sampleFileSelect.value : "";

	if (!fileName) {
		return;
	}

	try {
		let response = await fetch(`/api/files/${encodeURIComponent(fileName)}`);

		if (!response.ok) {
			response = await fetch(`./SampleData/${encodeURIComponent(fileName)}`);
		}

		if (!response.ok) {
			return;
		}

		sampleInput.value = await response.text();
		scheduleValidation();
	} catch {
		try {
			const fallbackResponse = await fetch(`./SampleData/${encodeURIComponent(fileName)}`);

			if (!fallbackResponse.ok) {
				return;
			}

			sampleInput.value = await fallbackResponse.text();
			scheduleValidation();
		} catch {
			// Fallback load failed — leave sample text unchanged
		}
	}
}

if (sampleFileSelect) {
	sampleFileSelect.addEventListener("change", () => { void onSampleFileChange(); });
}

regexInput.addEventListener("input", scheduleValidation);
sampleInput.addEventListener("input", scheduleValidation);
sampleInput.addEventListener("scroll", syncHighlightScroll);

void loadFileList();
void validateAndMatch();
syncHighlightScroll();
