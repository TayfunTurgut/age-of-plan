export type Civ = { id: string; name: string; variantOf?: string };

export const CIVS: Civ[] = [
  // Base civs (12)
  { id: "english", name: "English" },
  { id: "french", name: "French" },
  { id: "hre", name: "Holy Roman Empire" },
  { id: "mongols", name: "Mongols" },
  { id: "rus", name: "Rus" },
  { id: "chinese", name: "Chinese" },
  { id: "delhi", name: "Delhi Sultanate" },
  { id: "abbasid", name: "Abbasid Dynasty" },
  { id: "ottomans", name: "Ottomans" },
  { id: "malians", name: "Malians" },
  { id: "byzantines", name: "Byzantines" },
  { id: "japanese", name: "Japanese" },

  // Variants (10)
  { id: "ayyubids", name: "Ayyubids", variantOf: "abbasid" },
  { id: "zhu-xi", name: "Zhu Xi's Legacy", variantOf: "chinese" },
  { id: "jeanne-darc", name: "Jeanne d'Arc", variantOf: "french" },
  { id: "order-of-the-dragon", name: "Order of the Dragon", variantOf: "hre" },
  { id: "knights-templar", name: "Knights Templar", variantOf: "french" },
  { id: "house-of-lancaster", name: "House of Lancaster", variantOf: "english" },
  { id: "golden-horde", name: "Golden Horde", variantOf: "mongols" },
  { id: "macedonian", name: "Macedonian Dynasty", variantOf: "byzantines" },
  { id: "sengoku-daimyo", name: "Sengoku Daimyo", variantOf: "japanese" },
  { id: "tughluqid", name: "Tughluqid Dynasty", variantOf: "delhi" },
];
