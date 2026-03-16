const regexInput = document.getElementById("regexText");
const sampleInput = document.getElementById("sampleText");
const outputInput = document.getElementById("outputText");
const matchCountDigit = document.querySelector(".zero-spinner-digit");
const sampleFileSelect = document.getElementById("sampleFileSelect");
let latestValidationRequestId = 0;
let validationTimeoutId;

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

async function validateAndMatch() {
	const requestId = ++latestValidationRequestId;

	if (!regexInput.value.trim()) {
		setMatchCount(0);
		outputInput.value = "0";
		return;
	}

	const parsed = parseRegex(regexInput.value);

	if (parsed.error) {
		setMatchCount(0);
		outputInput.value = parsed.error;
		return;
	}

	const regex = parsed.regex.global
		? parsed.regex
		: new RegExp(parsed.regex.source, `${parsed.regex.flags}g`);

	const sourceText = sampleInput.value;

	if (requestId !== latestValidationRequestId) {
		return;
	}

	if (!sourceText.trim()) {
		setMatchCount(0);
		outputInput.value = "0";
		return;
	}

	const matches = Array.from(sourceText.matchAll(regex));

	if (matches.length === 0) {
		setMatchCount(0);
		outputInput.value = "0";
		return;
	}

	setMatchCount(matches.length);

	const formattedMatches = matches
		.map((match, index) => `Match ${index + 1}: ${match[0]}`)
		.join(", ");

	outputInput.value = formattedMatches;
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
			return;
		}

		const files = await response.json();

		// Clear all options except the placeholder
		while (sampleFileSelect.options.length > 1) {
			sampleFileSelect.remove(1);
		}

		for (const name of files) {
			const option = document.createElement("option");
			option.value = name;
			option.textContent = name;
			sampleFileSelect.appendChild(option);
		}
	} catch {
		// Service not available — file selector stays empty
	}
}

async function onSampleFileChange() {
	const fileName = sampleFileSelect ? sampleFileSelect.value : "";

	if (!fileName) {
		return;
	}

	try {
		const response = await fetch(`/api/files/${encodeURIComponent(fileName)}`);

		if (!response.ok) {
			return;
		}

		sampleInput.value = await response.text();
		scheduleValidation();
	} catch {
		// Service not available — leave sample text unchanged
	}
}

if (sampleFileSelect) {
	sampleFileSelect.addEventListener("change", () => { void onSampleFileChange(); });
}

regexInput.addEventListener("input", scheduleValidation);
sampleInput.addEventListener("input", scheduleValidation);

void loadFileList();
void validateAndMatch();
