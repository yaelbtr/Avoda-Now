import { LEGAL_DOCUMENT_LABELS, LEGAL_DOCUMENT_PATHS, type LegalConsentType } from "@shared/const";

interface Props {
  types: readonly LegalConsentType[];
}

// מחבר קישורים inline: "ל [a]" / "ל [a] ול [b]" / "ל [a], [b] ול [c]"
export function LegalConsentLinks({ types }: Props) {
  if (types.length === 0) return null;
  return (
    <>
      קראתי ואני מסכים/ה ל
      {types.map((type, i) => {
        const isLast = i === types.length - 1;
        const isFirst = i === 0;
        const prefix = isFirst ? " " : isLast ? " ול" : ", ";
        return (
          <span key={type}>
            {prefix}
            <a
              href={LEGAL_DOCUMENT_PATHS[type]}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
            >
              {LEGAL_DOCUMENT_LABELS[type]}
            </a>
          </span>
        );
      })}
    </>
  );
}
