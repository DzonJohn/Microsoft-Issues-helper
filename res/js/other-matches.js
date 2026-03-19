const detailSummary = document.getElementById("detailSummary");
const detailResults = document.getElementById("detailResults");
const storageKey = "regexOtherMatchesDetails";

function parseRegex(patternText) {
	const trimmed = (patternText ?? "").trim();

	if (!trimmed) {
		return { error: "No regex pattern available." };
	}

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
				return { error: "Invalid regex pattern." };
			}

			const pattern = trimmed.slice(1, closingSlashIndex);
			const flags = trimmed.slice(closingSlashIndex + 1);
			return { regex: new RegExp(pattern, flags) };
		}

		return { regex: new RegExp(trimmed) };
	} catch {
		return { error: "Invalid regex pattern." };
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

function highlightLine(lineText, regex) {
	const globalRegex = regex.global
		? regex
		: new RegExp(regex.source, `${regex.flags}g`);
	const matches = Array.from(lineText.matchAll(globalRegex));

	if (matches.length === 0) {
		return escapeHtml(lineText);
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
			chunks.push(escapeHtml(lineText.slice(cursor, index)));
		}

		if (text.length > 0) {
			chunks.push(`<span class="detail-hit">${escapeHtml(text)}</span>`);
			cursor = index + text.length;
		}
	}

	if (cursor < lineText.length) {
		chunks.push(escapeHtml(lineText.slice(cursor)));
	}

	return chunks.join("");
}

function renderNoData(message) {
	detailSummary.textContent = message;
	detailResults.innerHTML = "";
}

function renderDetails(data) {
	const parsed = parseRegex(data.patternText);

	if (parsed.error) {
		renderNoData(parsed.error);
		return;
	}

	detailSummary.textContent = `Found ${data.totalMatches} matches in ${data.filesWithMatches} files.`;
	detailResults.innerHTML = "";

	for (const file of data.files) {
		const card = document.createElement("section");
		card.className = "detail-card";

		const heading = document.createElement("h2");
		heading.textContent = file.fileName;
		card.appendChild(heading);

		for (const line of file.lines) {
			const lineElement = document.createElement("p");
			lineElement.className = "detail-line";
			lineElement.innerHTML = `Line ${line.lineNumber}: ${highlightLine(line.text, parsed.regex)}`;
			card.appendChild(lineElement);
		}

		detailResults.appendChild(card);
	}
}

function init() {
	const raw = sessionStorage.getItem(storageKey);

	if (!raw) {
		renderNoData("No saved search results found. Run Search other files first.");
		return;
	}

	try {
		const data = JSON.parse(raw);
		if (!data || !Array.isArray(data.files)) {
			renderNoData("Saved results are not valid.");
			return;
		}
		renderDetails(data);
	} catch {
		renderNoData("Could not read saved search results.");
	}
}

init();
