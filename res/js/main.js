const regexInput = document.getElementById("regexText");
const sampleInput = document.getElementById("sampleText");
const outputInput = document.getElementById("outputText");

function parseRegex(patternText) {
	const trimmed = patternText.trim();

	if (!trimmed) {
		return { error: "Enter a regex pattern." };
	}

	// Supports either plain patterns (abc) or slash format (/abc/i).
	const slashFormat = trimmed.match(/^\/(.*)\/([a-z]*)$/i);

	try {
		if (slashFormat) {
			return { regex: new RegExp(slashFormat[1], slashFormat[2]) };
		}

		return { regex: new RegExp(trimmed) };
	} catch (error) {
		return { error: `Invalid regex: ${error.message}` };
	}
}

function validateAndMatch() {
	const parsed = parseRegex(regexInput.value);

	if (parsed.error) {
		outputInput.value = parsed.error;
		return;
	}

	const matches = sampleInput.value.match(parsed.regex);

	if (!matches) {
		outputInput.value = "No match";
		return;
	}

	outputInput.value = `Match: ${matches[0]}`;
}

regexInput.addEventListener("input", validateAndMatch);
sampleInput.addEventListener("input", validateAndMatch);

validateAndMatch();
