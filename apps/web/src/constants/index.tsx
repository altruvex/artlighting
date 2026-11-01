export const exploreEftar = [
  {
    id: "eftar-2020",
    imgUrl: "/eftar/eftar-1.jpg",
    title: "Eftar 2020",
  },
  {
    id: "eftar-2021",
    imgUrl: "/eftar/eftar-5.jpg",
    title: "Eftar 2021",
  },
  {
    id: "eftar-2024",
    imgUrl: "/eftar/eftar-3.jpg",
    title: "Eftar 2024",
  },
  {
    id: "eftar-2019",
    imgUrl: "/eftar/eftar-4.jpg",
    title: "Eftar 2019",
  },
  {
    id: "eftar-2022",
    imgUrl: "/eftar/eftar-2.jpg",
    title: "Eftar 2022",
  },
];
export const newCollectionProducts = [
  {
    id: "track",
    nameKey: "collection.products.track",
    image: "/new-collection/new-collection-1.jpg"
  },
  {
    id: "bollard",
    nameKey: "collection.products.bollard",
    image: "/new-collection/new-collection-2.jpg"
  },
  {
    id: "spot",
    nameKey: "collection.products.spot",
    image: "/new-collection/new-collection-3.jpg"
  },
];

export const brands = [
  {
    id: "balcom",
    name: "Balcom",
    logo1: "/brand/balcom-black.png",
    logo2: "/brand/balcom-white.png",
    link: "/category/balcom",
  },
  {
    id: "misterLed",
    name: "Mister LED",
    logo1: "/brand/mrled-black.png",
    logo2: "/brand/mrled-white.png",
    link: "/category/mister-led",
  }
];

export const brandConfig = {
  featured: ["balcom", "misterLed"],
  comingSoon: ["jetra"],
  defaultImage: {
    width: 250,
    height: 100
  }
};
export const getBrandById = (id: string) => {
  return brands.find(brand => brand.id === id);
};

export const isBrandFeatured = (id: string): boolean => {
  return brandConfig.featured.includes(id);
};

export const isBrandComingSoon = (id: string): boolean => {
  return brandConfig.comingSoon.includes(id);
};

// IndoorItems
export const IndoorItems = [
  {
    id: "strip",
    spotlightType: "Strip",
    href: "/category/balcom/indoor/strip",
  },
  {
    id: "linear",
    spotlightType: "Linear",
    href: "/category/balcom/indoor/linear",
  },
  {
    id: "track-light",
    spotlightType: "Track Light",
    href: "/category/balcom/indoor/track-light",
  },
  {
    id: "cob",
    spotlightType: "COB",
    href: "/category/balcom/indoor/cob",
  },
  {
    id: "panel-light",
    spotlightType: "Panel Light",
    href: "/category/balcom/indoor/panel-light",
  },
  {
    id: "double-spotlight",
    spotlightType: "Double Spotlight",
    href: "/category/balcom/indoor/double-spotlight",
  },
];
// outdoor items
export const OutdoorItems = [
  {
    id: "spikes",
    spotlightType: "Spikes",
    href: "/category/balcom/outdoor/spikes",
  },
  {
    id: "uplight",
    spotlightType: "Uplight",
    href: "/category/balcom/outdoor/uplight",
  },
  {
    id: "flood-light",
    spotlightType: "Flood Light",
    href: "/category/balcom/outdoor/flood-light",
  },
  {
    id: "pole",
    spotlightType: "Pole",
    href: "/category/balcom/outdoor/pole",
  },
  {
    id: "bollard",
    spotlightType: "Bollard",
    href: "/category/balcom/outdoor/bollard",
  },
  {
    id: "wall-washer",
    spotlightType: "Wall Washer",
    href: "/category/balcom/outdoor/wall-washer",
  },
];


export const ChandelierItems = [
  { id: "MC15C", spotlightType: "MC15C", href: "/category/mister-led/chandelier/MC15C" },
  { id: "MC15E", spotlightType: "MC15E", href: "/category/mister-led/chandelier/MC15E" },
  { id: "MC15F", spotlightType: "MC15F", href: "/category/mister-led/chandelier/MC15F" },
  { id: "MC15W", spotlightType: "MC15W", href: "/category/mister-led/chandelier/MC15W" },
  { id: "MC15P", spotlightType: "MC15P", href: "/category/mister-led/chandelier/MC15P" },
  { id: "MC1608", spotlightType: "MC1608", href: "/category/mister-led/chandelier/MC1608" },
  { id: "MC6014", spotlightType: "MC6014", href: "/category/mister-led/chandelier/MC6014" },
  { id: "MC6015", spotlightType: "MC6015", href: "/category/mister-led/chandelier/MC6015" },
  { id: "MC6031", spotlightType: "MC6031", href: "/category/mister-led/chandelier/MC6031" },
  { id: "MC6038", spotlightType: "MC6038", href: "/category/mister-led/chandelier/MC6038" },
  { id: "MC6041", spotlightType: "MC6041", href: "/category/mister-led/chandelier/MC6041" },
  { id: "MC6051", spotlightType: "MC6051", href: "/category/mister-led/chandelier/MC6051" },
  { id: "MC6091", spotlightType: "MC6091", href: "/category/mister-led/chandelier/MC6091" },
  { id: "MC6094", spotlightType: "MC6094", href: "/category/mister-led/chandelier/MC6094" },
  { id: "MC6097", spotlightType: "MC6097", href: "/category/mister-led/chandelier/MC6097" },
  { id: "MC7021", spotlightType: "MC7021", href: "/category/mister-led/chandelier/MC7021" },
  { id: "MC7023", spotlightType: "MC7023", href: "/category/mister-led/chandelier/MC7023" },
  { id: "MC7091", spotlightType: "MC7091", href: "/category/mister-led/chandelier/MC7091" },
  { id: "MC7104", spotlightType: "MC7104", href: "/category/mister-led/chandelier/MC7104" },
  { id: "MC7105", spotlightType: "MC7105", href: "/category/mister-led/chandelier/MC7105" },
  { id: "OH0109", spotlightType: "OH0109", href: "/category/mister-led/chandelier/OH0109" },
  { id: "OH1109", spotlightType: "OH1109", href: "/category/mister-led/chandelier/OH1109" },
  { id: "OH1203", spotlightType: "OH1203", href: "/category/mister-led/chandelier/OH1203" },
  { id: "OH1207", spotlightType: "OH1207", href: "/category/mister-led/chandelier/OH1207" },
  { id: "OH1209", spotlightType: "OH1209", href: "/category/mister-led/chandelier/OH1209" },
  { id: "OH1309", spotlightType: "OH1309", href: "/category/mister-led/chandelier/OH1309" },
  { id: "OH1601", spotlightType: "OH1601", href: "/category/mister-led/chandelier/OH1601" },
].map(item => ({
  ...item,
  href: item.href.toLowerCase()
}));

export const projectDataForHeader = [
  {
    ProjectId: "dar-misr",
    ProjectName: "Dar-Misr",
    ProjectImages: ["/projects/dar-misr/dar-misr-1.png"],
    ProjectDescription: "Dar-Misr is a real estate compound.",
  },
  {
    ProjectId: "tolip",
    ProjectName: "Tolip Hotel",
    ProjectImages: ["/projects/tolip/tolip-1.jpg"],
    ProjectDescription:
      "Tolip Hotel El Galaa is a luxurious establishment located in Cairo, Egypt.",
  },
  {
    ProjectId: "al-majd",
    ProjectName: "Al-Majd Conference Center in Alexandria",
    ProjectImages: ["/projects/al-majd/al-majd-1.jpg"],
    ProjectDescription: "Al-Majd Conference Center in Alexandria.",
  },
  {
    ProjectId: "mansoura-hospital",
    ProjectName: "Mansoura Fever Hospital",
    ProjectImages: ["/projects/mansoura-hospital/mansoura-hospital-2.png"],
    ProjectDescription: "Mansoura Fever Hospital.",
  },
  {
    ProjectId: "esna-hospital",
    ProjectName: "Esna Hospital",
    ProjectImages: ["/projects/esna-hospital/esna-hospital-1.jpg"],
    ProjectDescription:
      "Esna Hospital serves the community of Esna by offering a wide range of medical services.",
  },
  {
    ProjectId: "armant-hospital",
    ProjectName: "Armant Hospital",
    ProjectImages: ["/projects/armant-hospital/armant-hospital-1.webp"],
    ProjectDescription:
      "Armant Hospital is a healthcare institution committed to delivering comprehensive medical services to its community.",
  },
];


export const CategoryItems = [
  {
    id: "balcom",
    title: "Balcom",
    href: "/category/balcom/",
    image: "/indoor/products500/jy-535-5w/JY-535-5W (1).png"
  },
  {
    id: "mrled",
    title: "Mister Led",
    href: "/category/mister-led/",
    image: "/chandelier/MC6014/MC6014-H5.png"
  },
];