// Costo de envio por zona segun el departamento de entrega.
// El backend es la unica fuente de verdad del precio (nunca se confia en
// lo que mande el navegador); el frontend solo consulta esto para mostrar
// el costo antes de pagar.

const ZONES = [
  {
    id: "bogota-cundinamarca",
    label: "Bogotá y Cundinamarca",
    cost: 15000,
    departments: ["Bogotá D.C.", "Cundinamarca"],
  },
  {
    id: "insular-amazonia",
    label: "Amazonas y San Andrés, Providencia y Santa Catalina",
    cost: 35000,
    departments: ["Amazonas", "San Andrés y Providencia"],
  },
  {
    id: "nacional",
    label: "Resto del país",
    cost: 20000,
    departments: [
      "Antioquia",
      "Arauca",
      "Atlántico",
      "Bolívar",
      "Boyacá",
      "Caldas",
      "Caquetá",
      "Casanare",
      "Cauca",
      "Cesar",
      "Chocó",
      "Córdoba",
      "Guainía",
      "Guaviare",
      "Huila",
      "La Guajira",
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
      "Vaupés",
      "Vichada",
    ],
  },
];

const DEPARTMENT_TO_ZONE = new Map();
for (const zone of ZONES) {
  for (const dep of zone.departments) {
    DEPARTMENT_TO_ZONE.set(dep, zone);
  }
}

const DEFAULT_ZONE = ZONES.find((z) => z.id === "nacional");

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
