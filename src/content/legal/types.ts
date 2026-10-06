export type LegalSection = { id: string; heading: string; paragraphs: string[] };

export type LegalContent = { privacy: LegalSection[]; terms: LegalSection[] };
