// Costo de envio por zona segun el departamento de entrega.
// El backend es la unica fuente de verdad del precio (nunca se confia en
// lo que mande el navegador); el frontend solo consulta esto para mostrar
// el costo antes de pagar.

const ZONES = [
  {
    id: "metropolitana",
    label: "Zona Metropolitana",
    cost: 20000,
    departments: ["Bogotá D.C.", "Cundinamarca"],
  },
  {
    id: "especial",
    label: "Zona Especial",
    cost: 50000,
    departments: [
      "Amazonas",
      "Arauca",
      "Chocó",
      "Guainía",
      "La Guajira",
      "San Andrés y Providencia",
      "Vaupés",
      "Vichada",
    ],
  },
  {
    id: "estandar",
    label: "Zona Nacional Estándar",
    cost: 35000,
    departments: [
      "Antioquia",
      "Atlántico",
      "Bolívar",
      "Boyacá",
      "Caldas",
      "Caquetá",
      "Casanare",
      "Cauca",
      "Cesar",
      "Córdoba",
      "Guaviare",
      "Huila",
      "Magdalena",
      "Meta",
      "Nariño",
      "Norte de Santander",
      "Putumayo",
      "Quindío",
      "Risaralda",
      "Santander",
      "Sucre",
      "Tolima",
      "Valle del Cauca",
    ],
  },
];

const DEPARTMENT_TO_ZONE = new Map();
for (const zone of ZONES) {
  for (const dep of zone.departments) {
    DEPARTMENT_TO_ZONE.set(dep, zone);
  }
}

const DEFAULT_ZONE = ZONES.find((z) => z.id === "estandar");

function getZoneForDepartment(department) {
  return DEPARTMENT_TO_ZONE.get(department) || DEFAULT_ZONE;
}

function getShippingCost(department) {
  return getZoneForDepartment(department).cost;
}

function getAllDepartments() {
  return ZONES.flatMap((zone) => zone.departments.map((name) => ({ name, zone: zone.id, zoneLabel: zone.label, cost: zone.cost }))).sort(
    (a, b) => a.name.localeCompare(b.name, "es")
  );
}

module.exports = { ZONES, getZoneForDepartment, getShippingCost, getAllDepartments };
