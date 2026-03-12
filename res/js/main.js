const urlInput = document.getElementById("urlText");
const regexInput = document.getElementById("regexText");
const sampleInput = document.getElementById("sampleText");
const outputInput = document.getElementById("outputText");
const matchCountDigit = document.querySelector(".zero-spinner-digit");

const urlService = {
	process(urlText) {
		const trimmed = urlText.trim();

		if (!trimmed) {
			return { url: "" };
		}

		try {
			return { url: new URL(trimmed).toString() };
		} catch {
			return { error: "Invalid URL for service input." };
		}
	}
};

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

function validateAndMatch() {
	const processedUrl = urlService.process(urlInput.value);

	if (processedUrl.error) {
		setMatchCount(0);
		outputInput.value = processedUrl.error;
		return;
	}

	if (!regexInput.value.trim() || !sampleInput.value.trim()) {
		setMatchCount(0);
		outputInput.value = processedUrl.url
			? `Service URL: ${processedUrl.url}\n0`
			: "0";
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
	const matches = Array.from(sampleInput.value.matchAll(regex));

	if (matches.length === 0) {
		setMatchCount(0);
		outputInput.value = processedUrl.url
			? `Service URL: ${processedUrl.url}\n0`
			: "0";
		return;
	}

	setMatchCount(matches.length);

	const formattedMatches = matches
		.map((match, index) => `Match ${index + 1}: ${match[0]}`)
		.join(", ");

	outputInput.value = processedUrl.url
		? `Service URL: ${processedUrl.url}\n${formattedMatches}`
		: formattedMatches;
}

urlInput.addEventListener("input", validateAndMatch);
regexInput.addEventListener("input", validateAndMatch);
sampleInput.addEventListener("input", validateAndMatch);

validateAndMatch();
