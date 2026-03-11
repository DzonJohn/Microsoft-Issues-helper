const regexInput = document.getElementById("regexText");
const sampleInput = document.getElementById("sampleText");
const outputInput = document.getElementById("outputText");
const matchCountDigit = document.querySelector(".zero-spinner-digit");

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
	if (!regexInput.value.trim() || !sampleInput.value.trim()) {
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
	const matches = Array.from(sampleInput.value.matchAll(regex));

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

regexInput.addEventListener("input", validateAndMatch);
sampleInput.addEventListener("input", validateAndMatch);

validateAndMatch();
