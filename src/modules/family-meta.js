export const TOP_N = 5;
export const FAR_RIGHT_CODE = '70';

// family_code -> { short French label, tone token (color class) }
// Based on Manifesto Project / ParlGov party family coding used in elections.json.
export const FAMILY_META = {
  10: { label: 'Écologiste', tone: 'green' },
  20: { label: 'Extrême gauche', tone: 'burgundy' },
  30: { label: 'Gauche', tone: 'rose' },
  40: { label: 'Libéral', tone: 'amber' },
  50: { label: 'Centre-droit', tone: 'orange' },
  60: { label: 'Droite', tone: 'blue' },
  70: { label: 'Extrême droite', tone: 'red' },
  80: { label: 'Centre', tone: 'lime' },
  90: { label: 'Régional', tone: 'purple' },
  95: { label: 'Islamiste', tone: 'teal' },
  98: { label: 'Divers', tone: 'gray' },
};
