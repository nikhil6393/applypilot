export function validateTruth(profile, generatedContent) {
    const violations = [];
    // Convert the generated content to a string to easily search for fabricated words
    const contentStr = typeof generatedContent === 'string' ? generatedContent : JSON.stringify(generatedContent);
    const contentLower = contentStr.toLowerCase();
    // Extract all valid terms from the profile
    const validCompanies = profile.experience?.map((e) => e.company.toLowerCase()) || [];
    const validSchools = profile.education?.map((e) => e.school.toLowerCase()) || [];
    const validDegrees = profile.education?.map((e) => e.degree.toLowerCase()) || [];
    const validSkills = [
        ...(profile.skills?.languages || []),
        ...(profile.skills?.frameworks || []),
        ...(profile.skills?.tools || []),
        ...(profile.skills?.domain || []),
    ].map((s) => s.toLowerCase());
    // A very basic check: we look for common red-flag fabrications
    // that Gemini or other models tend to invent if not anchored.
    const commonHallucinations = [
        'harvard',
        'stanford',
        'mit',
        'google',
        'amazon',
        'facebook',
        'meta',
        'apple',
        'netflix',
        'aws certified cloud practitioner',
        'certified scrum master',
        'pmp',
        'increased revenue by',
        'reduced costs by',
    ];
    for (const hallucination of commonHallucinations) {
        if (contentLower.includes(hallucination)) {
            // If the generated text includes a common hallucinated phrase,
            // check if it actually exists in the valid profile terms.
            let isTruthful = false;
            const allValidTerms = [...validCompanies, ...validSchools, ...validDegrees, ...validSkills];
            for (const term of allValidTerms) {
                if (term.includes(hallucination) || hallucination.includes(term)) {
                    isTruthful = true;
                    break;
                }
            }
            // Also check raw text just in case
            if (profile.rawText && profile.rawText.toLowerCase().includes(hallucination)) {
                isTruthful = true;
            }
            if (!isTruthful) {
                violations.push(`Fabricated entity detected: "${hallucination}"`);
            }
        }
    }
    return {
        valid: violations.length === 0,
        violations,
    };
}
