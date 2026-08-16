export interface ShippingZone {
  id: string;
  nameKa: string;
  nameEn: string;
  fee: number;
  descriptionKa?: string;
  descriptionEn?: string;
  isExcluded?: boolean;
}

export const TBILISI_EXCEPTIONS = ["თხინვალა", "კაკლები", "Tkhinvala", "Kaklebi"];

export const TBILISI_OUTER_LIMITS = [
  "ლილოს დასახლება", "დიდი ლილო", "პატარა ლილო", "ნასაგური", "წინუბანი",
  "ზემო ფონიჭალა", "ქვემო ფონიჭალა", "წყნეთი", "ბეთანია", "კიკეთი",
  "ოქროყანა", "წავკისი", "შინდისი", "ტაბახმელა", "კოჯორი", "ქოშიგორა",
  "Lilo Settlement", "Didi Lilo", "Patara Lilo", "Nasaguri", "Tsinubani",
  "Zemo Ponichala", "Kvemo Ponichala", "Tskneti", "Betania", "Kiketi",
  "Okrokana", "Tsavkisi", "Shindisi", "Tabakhmela", "Kojori", "Koshigora"
];

export const EXCLUDED_REGIONS = [
  "ფშავ-ხევსურეთი", "სვანეთი", "Pshav-Khevsureti", "Svaneti"
];

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "tbilisi-std",
    nameKa: "თბილისი - სტანდარტული",
    nameEn: "Tbilisi - Standard",
    fee: 5,
  },
  {
    id: "tbilisi-exc",
    nameKa: "თბილისი - გამონაკლისები (თხინვალა, კაკლები)",
    nameEn: "Tbilisi - Exceptions (Tkhinvala, Kaklebi)",
    fee: 6,
  },
  {
    id: "tbilisi-outer",
    nameKa: "თბილისი - გარეუბნები (წყნეთი, კოჯორი, ფონიჭალა, ლილო და სხვ.)",
    nameEn: "Tbilisi - Outer Limits (Tskneti, Kojori, Ponichala, Lilo, etc.)",
    fee: 7,
    descriptionKa: "ლილო, ნასაგური, წინუბანი, ფონიჭალა, წყნეთი, ბეთანია, კიკეთი, ოქროყანა, წავკისი, შინდისი, ტაბახმელა, კოჯორი, ქოშიგორა",
  },
  {
    id: "region-city",
    nameKa: "რეგიონი - ქალაქი",
    nameEn: "Regions - Cities",
    fee: 8,
  },
  {
    id: "region-village",
    nameKa: "რეგიონი - სოფელი/რაიონი",
    nameEn: "Regions - Villages/Districts",
    fee: 10,
    descriptionKa: "არ მოიცავს ფშავ-ხევსურეთსა და სვანეთს",
    descriptionEn: "Excludes Pshav-Khevsureti and Svaneti",
  }
];
