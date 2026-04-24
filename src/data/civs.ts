export type Civ = {
  id: string;
  name: string;
  variantOf?: string;
  /** 2–3 signature units / landmarks / bonuses, joined by " • " for display. */
  tagline: string;
  /** Two HSL color stops (CSS color values) for the placeholder flag gradient. */
  flagColor: { from: string; to: string };
  /** Path (relative to ASSET_BASE_URL) to the civ flag icon. */
  flagIcon: string;
};

export const CIVS: Civ[] = [
  // Base civs (12)
  {
    id: "english",
    name: "English",
    tagline: "Longbowman • Council Hall • Farm bonus",
    flagColor: { from: "hsl(0 70% 45%)", to: "hsl(0 0% 92%)" },
    flagIcon: "civilization_flag/CivIcon-EnglishAoE4.webp",
  },
  {
    id: "french",
    name: "French",
    tagline: "Royal Knight • Chamber of Commerce • Trade bonus",
    flagColor: { from: "hsl(220 70% 35%)", to: "hsl(45 80% 55%)" },
    flagIcon: "civilization_flag/CivIcon-FrenchAoE4.webp",
  },
  {
    id: "hre",
    name: "Holy Roman Empire",
    tagline: "Landsknecht • Aachen Chapel • Prelate inspirations",
    flagColor: { from: "hsl(0 0% 12%)", to: "hsl(45 85% 55%)" },
    flagIcon: "civilization_flag/CivIcon-HREAoE4.webp",
  },
  {
    id: "mongols",
    name: "Mongols",
    tagline: "Mangudai • Steppe Redoubt • Mobile bases",
    flagColor: { from: "hsl(200 65% 45%)", to: "hsl(40 50% 75%)" },
    flagIcon: "civilization_flag/CivIcon-MongolsAoE4.webp",
  },
  {
    id: "rus",
    name: "Rus",
    tagline: "Streltsy • Kremlin • Hunting cabins",
    flagColor: { from: "hsl(140 35% 30%)", to: "hsl(38 55% 70%)" },
    flagIcon: "civilization_flag/CivIcon-RusAoE4.webp",
  },
  {
    id: "chinese",
    name: "Chinese",
    tagline: "Zhuge Nu • Imperial Academy • Dynasties",
    flagColor: { from: "hsl(0 75% 40%)", to: "hsl(45 90% 55%)" },
    flagIcon: "civilization_flag/CivIcon-ChineseAoE4.webp",
  },
  {
    id: "delhi",
    name: "Delhi Sultanate",
    tagline: "War Elephant • Tower of Victory • Free techs",
    flagColor: { from: "hsl(150 55% 30%)", to: "hsl(45 80% 60%)" },
    flagIcon: "civilization_flag/CivIcon-DelhiAoE4.webp",
  },
  {
    id: "abbasid",
    name: "Abbasid Dynasty",
    tagline: "Camel Archer • House of Wisdom • Golden Age",
    flagColor: { from: "hsl(160 45% 28%)", to: "hsl(45 75% 60%)" },
    flagIcon: "civilization_flag/CivIcon-AbbasidAoE4.webp",
  },
  {
    id: "ottomans",
    name: "Ottomans",
    tagline: "Janissary • Mehmed Imperial Armory • Military Schools",
    flagColor: { from: "hsl(0 75% 40%)", to: "hsl(0 0% 95%)" },
    flagIcon: "civilization_flag/CivIcon-OttomansAoE4.webp",
  },
  {
    id: "malians",
    name: "Malians",
    tagline: "Sofa • Farimba Garrison • Gold pits",
    flagColor: { from: "hsl(45 80% 50%)", to: "hsl(25 70% 35%)" },
    flagIcon: "civilization_flag/CivIcon-MaliansAoE4.webp",
  },
  {
    id: "byzantines",
    name: "Byzantines",
    tagline: "Cataphract • Cistern • Olive Oil economy",
    flagColor: { from: "hsl(280 45% 35%)", to: "hsl(45 85% 60%)" },
    flagIcon: "civilization_flag/CivIcon-ByzantinesAoE4.webp",
  },
  {
    id: "japanese",
    name: "Japanese",
    tagline: "Samurai • Castle • Bannerman buffs",
    flagColor: { from: "hsl(0 75% 45%)", to: "hsl(0 0% 96%)" },
    flagIcon: "civilization_flag/CivIcon-JapaneseAoE4.webp",
  },

  // Variants (10)
  {
    id: "ayyubids",
    name: "Ayyubids",
    variantOf: "abbasid",
    tagline: "Atabeg • Trade Wing • Wing-based decisions",
    flagColor: { from: "hsl(160 50% 22%)", to: "hsl(45 70% 70%)" },
    flagIcon: "civilization_flag/CivIcon-AyyubidsAoE4.webp",
  },
  {
    id: "zhu-xi",
    name: "Zhu Xi's Legacy",
    variantOf: "chinese",
    tagline: "Yuan Raider • Shaolin Monastery • Tax bonuses",
    flagColor: { from: "hsl(0 80% 32%)", to: "hsl(45 85% 65%)" },
    flagIcon: "civilization_flag/CivIcon-ZhuXiLegacyAoE4.webp",
  },
  {
    id: "jeanne-darc",
    name: "Jeanne d'Arc",
    variantOf: "french",
    tagline: "Jeanne hero • Companion units • Levelling hero",
    flagColor: { from: "hsl(220 75% 45%)", to: "hsl(45 90% 70%)" },
    flagIcon: "civilization_flag/CivIcon-JeanneDArcAoE4.webp",
  },
  {
    id: "order-of-the-dragon",
    name: "Order of the Dragon",
    variantOf: "hre",
    tagline: "Dragon Knight • Veteran upgrades • Costlier vils",
    flagColor: { from: "hsl(0 0% 8%)", to: "hsl(0 70% 50%)" },
    flagIcon: "civilization_flag/CivIcon-OrderOfTheDragonAoE4.webp",
  },
  {
    id: "knights-templar",
    name: "Knights Templar",
    variantOf: "french",
    tagline: "Templar Knight • Commanderies • Pilgrim economy",
    flagColor: { from: "hsl(0 0% 95%)", to: "hsl(0 75% 45%)" },
    flagIcon: "civilization_flag/CivIcon-KnightsTemplarAoE4.webp",
  },
  {
    id: "house-of-lancaster",
    name: "House of Lancaster",
    variantOf: "english",
    tagline: "Lancaster Knight • Manors • Garrison bonuses",
    flagColor: { from: "hsl(0 75% 40%)", to: "hsl(38 60% 75%)" },
    flagIcon: "civilization_flag/CivIcon-HouseofLancasterAoE4.webp",
  },
  {
    id: "golden-horde",
    name: "Golden Horde",
    variantOf: "mongols",
    tagline: "Keshik • Yam network • Cavalry mobility",
    flagColor: { from: "hsl(45 90% 55%)", to: "hsl(200 60% 40%)" },
    flagIcon: "civilization_flag/CivIcon-GoldenHordeAoE4.webp",
  },
  {
    id: "macedonian",
    name: "Macedonian Dynasty",
    variantOf: "byzantines",
    tagline: "Varangian Guard • Silver economy • Mercenaries",
    flagColor: { from: "hsl(280 50% 30%)", to: "hsl(0 0% 80%)" },
    flagIcon: "civilization_flag/CivIcon-MacedonianDynastyAoE4.webp",
  },
  {
    id: "sengoku-daimyo",
    name: "Sengoku Daimyo",
    variantOf: "japanese",
    tagline: "Onna-musha • Castle network • Daimyo tactics",
    flagColor: { from: "hsl(0 80% 38%)", to: "hsl(38 35% 25%)" },
    flagIcon: "civilization_flag/CivIcon-SengokuDaimyoAoE4.webp",
  },
  {
    id: "tughluqid",
    name: "Tughluqid Dynasty",
    variantOf: "delhi",
    tagline: "Ghazi Raider • Iqta system • Aggressive scholars",
    flagColor: { from: "hsl(150 60% 25%)", to: "hsl(45 70% 50%)" },
    flagIcon: "civilization_flag/CivIcon-TughlaqDynastyAoE4.webp",
  },
];

export const getCiv = (id: string | undefined): Civ | undefined =>
  id ? CIVS.find((c) => c.id === id) : undefined;
