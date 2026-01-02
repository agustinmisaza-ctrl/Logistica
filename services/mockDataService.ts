
import { InventoryRecord, Item, MovementRequest, ProjectProgress, Site, SiteType, Tool, ToolStatus, Transaction, User, UserRole, PricePoint } from '../types';

// --- CONSTANTS & DICTIONARIES FOR GENERATION ---
const CITIES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Pereira', 'Zipaquirá'];

const SITE_NAMES = [
  { name: 'ALMACEN STOCK MEDELLIN', type: SiteType.BODEGA_CENTRAL, budget: 0 },
  { name: 'ALMACEN STOCK BOGOTA', type: SiteType.BODEGA_CENTRAL, budget: 0 },
  { name: 'URB SALITRE LIVING BOG', type: SiteType.RESIDENTIAL, budget: 1500000000 },
  { name: 'SFV GRANJA LA FE BAQ', type: SiteType.SOLAR, budget: 2200000000 },
  { name: 'CLINICA COMEDAL MDE', type: SiteType.COMMERCIAL, budget: 1800000000 },
  { name: 'WAKE 2.0 MDE', type: SiteType.RESIDENTIAL, budget: 1200000000 },
  { name: 'SFV IED INMACULADA CONCE BAQ', type: SiteType.SOLAR, budget: 900000000 },
  { name: 'NAVITRANS PEI', type: SiteType.INDUSTRIAL, budget: 800000000 },
  { name: 'ALMA 72 BOG', type: SiteType.RESIDENTIAL, budget: 1100000000 },
  { name: 'NOMAD CABRERA BOG', type: SiteType.RESIDENTIAL, budget: 950000000 },
  { name: 'SFV BOMBEROS TECNOGLASS BAQ', type: SiteType.SOLAR, budget: 600000000 },
  { name: 'CLICK CLACK WE MDE', type: SiteType.COMMERCIAL, budget: 1400000000 },
  { name: 'SFV ALKOSTO MOSQUERA MOS', type: SiteType.SOLAR, budget: 2500000000 }
];

const REAL_INVENTORY_SOURCE = [
  { sku: "HJ000099", name: "CABLE 12 AWG FUERZA LSHF TC 600V 90C VERDE", qty: 29365, val: 58888041 },
  { sku: "005644", name: "TUERCA 3/8\"", qty: 22698, val: 1992928 },
  { sku: "000269", name: "ARANDELA 3/8", qty: 21294, val: 2255060 },
  { sku: "HJ000107", name: "CABLE 10 AWG FUERZA LSHF TC 600 V 90 C BLANCO", qty: 6163, val: 19515522 },
  { sku: "HJ000110", name: "CABLE 10 AWG FUERZA LSHF TC 600 V 90 C AZUL", qty: 5748, val: 18004512 },
  { sku: "004704", name: "TAPA 12X12 LISA GRIS", qty: 4524, val: 10081288 },
  { sku: "HJ000114", name: "CABLE 8 AWG FUERZA LSHF TC 600V 90C NEGRO", qty: 4221, val: 15117154 },
  { sku: "005698", name: "UNION EMT 3/4\"", qty: 2211, val: 2197742 },
  { sku: "009383", name: "CABLE 6 AWG FUERZA LSHF TC600V 90C NEGRO", qty: 2538, val: 21217903 },
  { sku: "013472", name: "CABLE 2/0 LSHF ALUMINIO", qty: 2407, val: 17010662 },
  { sku: "009590", name: "CABLE 4/0 LSHF ALUMINIO", qty: 2135, val: 21003831 },
  { sku: "005568", name: "TUBO EMT 3/4\"", qty: 958, val: 15866637 },
  { sku: "005627", name: "TUBO PVC 3/4\"", qty: 997, val: 4627277 },
  { sku: "001126", name: "CABLE CU.D 1/0", qty: 858, val: 24369681 },
  { sku: "005553", name: "TUBO EMT 1\"", qty: 760, val: 16872370 },
  { sku: "001339", name: "CABLE XLPE ALUMINIO 1/0 15KV 100% PANTALLA CINTA", qty: 239, val: 6166200 },
  { sku: "001129", name: "CABLE CU.D 2/0", qty: 558, val: 20172849 },
  { sku: "005559", name: "TUBO EMT 1/2\"", qty: 565, val: 5096113 },
  { sku: "009384", name: "CABLE 4 AWG FUERZA LSHF TC 600V 90C NEGRO", qty: 869, val: 9905085 },
  { sku: "009385", name: "CABLE 2 AWG FUERZA LSHF TC 600V 90C NEGRO", qty: 1396, val: 28463916 },
  { sku: "005557", name: "TUBO EMT 1.1/2\"", qty: 122, val: 5327399 },
  { sku: "009392", name: "CABLE 350 kCMIL FUERZA LSHF TC 600V 90C NEGRO", qty: 226, val: 23114446 },
  { sku: "009386", name: "CABLE 1/0 AWG FUERZA LSHF TC 600V 90C NEGRO", qty: 455, val: 10905581 },
  { sku: "005562", name: "TUBO EMT 3\"", qty: 101, val: 10940516 },
  { sku: "49099", name: "TRAMO RECTO BLINDOBARRA 630 AMP 3P4W+50%E", qty: 99, val: 79688664 },
  { sku: "49089", name: "TRAMO RECTO BLINDOBARRA 800 AMP 4W(200%N)+50%E", qty: 95, val: 92933940 },
  { sku: "002441", name: "DUCTO 40X10 GALVANIZADA", qty: 116, val: 14709331 },
  { sku: "009393", name: "CABLE 500 kCMIL FUERZA LSHF TC 600V 90C NEGRO", qty: 80, val: 12334846 },
  { sku: "004640", name: "TABLERO 3F 12 CTOS ESPACIO PARA TOTALIZADOR SCHNEIDER", qty: 61, val: 16559359 },
  { sku: "63915", name: "LUMINARIA LED TIPO HERMÉTICA 36W EMERGENCIA", qty: 164, val: 61664000 },
  { sku: "47078", name: "TRANSFORMADOR PARA 800KVA BT-BT", qty: 2, val: 110424800 },
  { sku: "017197", name: "INVERSOR HUAWEI SUN2000 80K-MGL0 220V", qty: 2, val: 37539600 },
  { sku: "47212", name: "T-DISTRIBUCIÓN ALUMBRADO – TOMAS - DATACENTER C4 DU", qty: 1, val: 62750000 },
  { sku: "47204", name: "CELDA GENERAL TRANSFERENCIA A 480VAC LABORATORIOS", qty: 1, val: 62502000 },
  { sku: "47079", name: "TRANSFORMADOR PARA 630KVA BT-BT", qty: 1, val: 47433000 },
  { sku: "68951", name: "TABLERO 103COLP-01", qty: 1, val: 44635841 },
  { sku: "70673", name: "LUMINARIA LED TIPO HIGH BAY 174W", qty: 64, val: 46425600 },
  { sku: "68949", name: "TABLERO BANCO CONDENSADORES 75 KVAR", qty: 1, val: 40468180 },
  { sku: "002862", name: "GRAPA GALVAN DOBLE ALA 3/4\"", qty: 7230, val: 1357378 },
  { sku: "001992", name: "CONECTOR RESORTE GARDEN - BENDER 10-12 ROJO", qty: 15557, val: 3075006 },
  { sku: "001714", name: "CHAZO NYLON DE 1/4 X 1.1/2\"", qty: 12631, val: 1809511 },
  { sku: "001722", name: "CHAZO PLASTICO SUPRA 1/4X1,1/4\"", qty: 10103, val: 1754605 },
  { sku: "006017", name: "MARCACION TIPO ANILLO AR1", qty: 5662, val: 905920 },
  { sku: "004986", name: "TERMINAL DE OJO 10-12 DE 1/4", qty: 8199, val: 1721645 },
  { sku: "000266", name: "ARANDELA 1/4", qty: 6935, val: 496623 },
  { sku: "005330", name: "TORNILLO CABEZA LENTEJA 1/4X1/2\"", qty: 3958, val: 404247 },
  { sku: "002196", name: "CAJA DE EMPALME 12X12X5 GRIS", qty: 865, val: 3559541 },
  { sku: "71132", name: "CABLE GENESIS 2X16 SIN BLINDAR CARRETE", qty: 1206, val: 3453550 },
  { sku: "001190", name: "CABLE FIBRA OPTICA MULT. 12HILOS 50/125 LEVITON", qty: 20, val: 295800 },
  { sku: "001325", name: "CABLE UTP CATEGORIA 6A", qty: 1016, val: 2331377 },
  { sku: "002556", name: "ESPARRAGO DE 3/8 X 3 MTRS", qty: 445, val: 4077769 },
  { sku: "001170", name: "CABLE ENCAUCHETADO 3X16", qty: 512, val: 1937034 },
  { sku: "005132", name: "TOMA DOBLE LEVITON BLANCO PAT", qty: 645, val: 3351137 },
  { sku: "006294", name: "SOPORTE BEAM CLAMP 3/8", qty: 574, val: 3359076 },
  { sku: "003841", name: "PERFIL RANURADO 4X4 X 3MTS GALVANIZADO", qty: 120, val: 5200698 }
];

const determineCategory = (name: string): Item['category'] => {
    const n = name.toUpperCase();
    if (n.includes('CABLE') || n.includes('ALAMBRE') || n.includes('CONDUCTOR') || n.includes('CORDON')) return 'CABLES';
    if (n.includes('TUBO') || n.includes('CURVA') || n.includes('UNION') || n.includes('ADAPTADOR') || n.includes('CANALETA') || n.includes('DUCTO') || n.includes('BANDEJA') || n.includes('CODO') || n.includes('CONDULETE')) return 'TUBERIA';
    if (n.includes('BREAKER') || n.includes('TABLERO') || n.includes('TOTALIZADOR') || n.includes('TOMA') || n.includes('INTERR') || n.includes('DPS') || n.includes('TRANSFORMADOR') || n.includes('CELDA') || n.includes('GABINETE')) return 'PROTECCION';
    if (n.includes('LUMINARIA') || n.includes('REFLECTOR') || n.includes('BALA') || n.includes('BOMBILLO') || n.includes('LED') || n.includes('PANEL')) return 'ILUMINACION';
    if (n.includes('BROCA') || n.includes('SIERRA') || n.includes('ALICATE') || n.includes('DESTORNILLADOR') || n.includes('HERRAMIENTA') || n.includes('TALADRO') || n.includes('MULTIMETRO') || n.includes('PINZA') || n.includes('PONCHADORA') || n.includes('MOLDE')) return 'HERRAMIENTA';
    return 'ACCESORIOS';
};

const generateSites = (): Site[] => {
  return SITE_NAMES.map((s, index) => ({
    id: `s${index + 1}`,
    name: s.name,
    type: s.type,
    location: CITIES[index % CITIES.length],
    budget: s.budget
  }));
};

const generateItemsFromRealData = (): Item[] => {
  return REAL_INVENTORY_SOURCE.map(row => {
      const estimatedCost = row.qty > 0 ? row.val / row.qty : row.val;
      const history: PricePoint[] = [];
      for (let m = 5; m >= 0; m--) {
          const date = new Date();
          date.setMonth(date.getMonth() - m);
          const fluctuation = 0.95 + (Math.random() * 0.1);
          history.push({
              date: date.toISOString().substring(0, 7),
              price: Math.round(estimatedCost * fluctuation)
          });
      }
      return {
          id: row.sku,
          sku: row.sku,
          name: row.name,
          category: determineCategory(row.name),
          unit: row.name.includes('CABLE') || row.name.includes('TUBO') ? 'mts' : 'und',
          cost: Math.round(estimatedCost),
          imageUrl: `https://placehold.co/100?text=${row.name.substring(0,3).toUpperCase()}`,
          priceHistory: history
      };
  });
};

export let SITES: Site[] = generateSites();
export let ITEMS: Item[] = generateItemsFromRealData();

const INVENTORY_MOCK: InventoryRecord[] = [];
const TOOLS_MOCK: Tool[] = [];
const MOVEMENTS_MOCK: MovementRequest[] = [];
const TRANSACTIONS_MOCK: Transaction[] = [];
const PROGRESS_MOCK: ProjectProgress[] = [];

const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

const daysForward = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
};

// --- POPULATE TOOLS DATA ---
const populateTools = () => {
  const toolTemplates = [
    { name: 'Taladro Percutor 1/2"', brand: 'Bosch', category: 'ELECTRICA' as const },
    { name: 'Amoladora Angular 4-1/2"', brand: 'Makita', category: 'ELECTRICA' as const },
    { name: 'Multímetro Digital True RMS', brand: 'Fluke', category: 'MEDICION' as const },
    { name: 'Pinza Voltamperimétrica', brand: 'Fluke', category: 'MEDICION' as const },
    { name: 'Martillo Demoledor 15Kg', brand: 'Hilti', category: 'ELECTRICA' as const },
    { name: 'Nivel Láser Autonivelante', brand: 'Dewalt', category: 'MEDICION' as const },
    { name: 'Rotomartillo SDS Plus', brand: 'Milwaukee', category: 'ELECTRICA' as const },
    { name: 'Sierra Circular 7-1/4"', brand: 'Bosch', category: 'ELECTRICA' as const },
    { name: 'Doblador de Tubo EMT 3/4"', brand: 'Greenlee', category: 'MANUAL' as const },
    { name: 'Juego de Destornilladores Dieléctricos', brand: 'Klein Tools', category: 'MANUAL' as const },
    { name: 'Pistola de Calor Industrial', brand: 'Steinel', category: 'ELECTRICA' as const },
    { name: 'Analizador de Redes Trifásico', brand: 'Fluke', category: 'MEDICION' as const },
    { name: 'Arnés de Seguridad 4 Puntos', brand: 'MSA', category: 'SEGURIDAD' as const },
    { name: 'Escalera de Tijera Dieléctrica 8ft', brand: 'Werner', category: 'SEGURIDAD' as const },
    { name: 'Ponchadora Hidráulica 12 Ton', brand: 'Burndy', category: 'ELECTRICA' as const }
  ];

  for (let i = 0; i < 45; i++) {
    const template = toolTemplates[i % toolTemplates.length];
    const site = SITES[Math.floor(Math.random() * SITES.length)];
    const statusRand = Math.random();
    
    let status: ToolStatus = ToolStatus.OPERATIVA;
    if (statusRand > 0.85) status = ToolStatus.MANTENIMIENTO;
    else if (statusRand > 0.95) status = ToolStatus.REPARACION;

    // Lógica para alertas de mantenimiento (vencidos, pronto, lejos)
    let nextMaintDays = 0;
    if (i % 5 === 0) nextMaintDays = -Math.floor(Math.random() * 15 + 1); // Vencido
    else if (i % 7 === 0) nextMaintDays = Math.floor(Math.random() * 6); // Pronto (0-5 días)
    else nextMaintDays = Math.floor(Math.random() * 90 + 10); // Lejos

    TOOLS_MOCK.push({
      id: `tool-${i + 1}`,
      name: `${template.name} #${i + 101}`,
      serialNumber: `SN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      brand: template.brand,
      siteId: site.id,
      purchaseDate: daysAgo(Math.floor(Math.random() * 500 + 100)),
      warrantyExpirationDate: daysForward(Math.floor(Math.random() * 300 - 50)),
      nextMaintenanceDate: daysForward(nextMaintDays),
      status: status,
      category: template.category
    });
  }
};

(() => {
    populateTools();

    REAL_INVENTORY_SOURCE.forEach((row, idx) => {
        let remainingQty = row.qty;
        if (remainingQty <= 0) return;
        const cat = determineCategory(row.name);
        const numberOfSites = Math.floor(Math.random() * 4) + 1; 
        
        for (let i = 0; i < numberOfSites; i++) {
            if (remainingQty <= 0) break;
            const site = SITES[Math.floor(Math.random() * SITES.length)];
            let qtyForSite = (i === numberOfSites - 1) ? remainingQty : Math.floor(remainingQty * (0.2 + Math.random() * 0.3));
            if (qtyForSite > remainingQty) qtyForSite = remainingQty;
            if (qtyForSite === 0) continue;
            remainingQty -= qtyForSite;

            const recordId = `inv-${row.sku}-${site.id}`;
            let idleDays = cat === 'CABLES' ? Math.floor(Math.random() * 10) : (cat === 'PROTECCION' ? Math.floor(Math.random() * 100) + 20 : Math.floor(Math.random() * 45));

            INVENTORY_MOCK.push({
                id: recordId,
                itemId: row.sku,
                siteId: site.id,
                quantity: qtyForSite,
                lastMovedDate: daysAgo(idleDays)
            });

            // GESTIÓN DE DESPERDICIO REALISTA:
            if (site.type !== SiteType.BODEGA_CENTRAL) {
                const wastageFactor = cat === 'CABLES' ? 0.08 : (cat === 'TUBERIA' ? 0.05 : 0.02);
                const randomWastage = wastageFactor * (Math.random() * 1.5); 
                
                const installedQty = Math.floor(qtyForSite * 1.5); 
                const lostQty = Math.floor((qtyForSite + installedQty) * randomWastage);
                const totalEntries = qtyForSite + installedQty + lostQty;

                TRANSACTIONS_MOCK.push({
                    id: `tx_entry_${recordId}`,
                    itemId: row.sku,
                    siteId: site.id,
                    quantity: totalEntries,
                    date: daysAgo(Math.floor(Math.random() * 60) + 10),
                    type: 'ENTRY'
                });

                PROGRESS_MOCK.push({
                    id: `prog-${recordId}`,
                    siteId: site.id,
                    itemId: row.sku,
                    quantityInstalled: installedQty,
                    lastReportDate: daysAgo(2)
                });
            } else {
                TRANSACTIONS_MOCK.push({
                    id: `tx_entry_${recordId}`,
                    itemId: row.sku,
                    siteId: site.id,
                    quantity: qtyForSite,
                    date: daysAgo(100),
                    type: 'ENTRY'
                });
            }
        }
    });
})();

export const setGlobalReferenceData = (sites: Site[], items: Item[]) => {
    if(sites.length > 0) SITES = sites;
    if(items.length > 0) ITEMS = items;
}

export const getInventoryWithDetails = (currentInventory: InventoryRecord[]) => {
  return currentInventory.map(inv => {
    const item = ITEMS.find(i => i.id === inv.itemId);
    const site = SITES.find(s => s.id === inv.siteId);
    const lastMoved = new Date(inv.lastMovedDate);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - lastMoved.getTime()) / (1000 * 60 * 60 * 24)); 
    return {
      ...inv,
      itemName: item?.name || `Item ${inv.itemId}`,
      itemSku: item?.sku || 'N/A',
      imageUrl: item?.imageUrl || 'https://placehold.co/100', 
      category: item?.category || 'ACCESORIOS',
      unit: item?.unit || 'und',
      cost: item?.cost || 0,
      priceHistory: item?.priceHistory || [],
      totalValue: (item?.cost || 0) * inv.quantity,
      siteName: site?.name || `Site ${inv.siteId}`,
      siteType: site?.type,
      daysIdle: diffDays,
      isStagnant: diffDays > 30
    };
  });
};

export const getToolsWithDetails = (tools: Tool[]) => {
  return tools.map(tool => {
     const site = SITES.find(s => s.id === tool.siteId);
     const now = new Date();
     const maintDate = new Date(tool.nextMaintenanceDate);
     const warrantyDate = new Date(tool.warrantyExpirationDate);
     const daysToMaintenance = Math.ceil((maintDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); 
     const daysToWarranty = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
     return {
       ...tool,
       siteName: site?.name || 'Unknown',
       daysToMaintenance,
       daysToWarranty,
       maintenanceAlert: daysToMaintenance < 0 ? 'OVERDUE' : daysToMaintenance < 15 ? 'SOON' : 'OK',
       warrantyAlert: daysToWarranty < 0 ? 'EXPIRED' : daysToWarranty < 30 ? 'EXPIRING' : 'OK'
     };
  });
};

export const mockApiService = {
    login: async (u: string, p: string): Promise<User> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const foundUser = USERS_MOCK.find(user => user.username.toLowerCase() === u.toLowerCase().trim());
                if (foundUser) resolve(foundUser);
                else reject(new Error("Usuario no encontrado"));
            }, 800);
        });
    },
    getSites: async () => SITES,
    getInventory: async () => INVENTORY_MOCK,
    getTools: async () => TOOLS_MOCK,
    getMovements: async () => MOVEMENTS_MOCK,
    getTransactions: async () => TRANSACTIONS_MOCK,
    getProgress: async () => PROGRESS_MOCK,
    getUsers: async (): Promise<User[]> => {
        return new Promise(resolve => setTimeout(() => resolve([...USERS_MOCK]), 500));
    },
    createUser: async (userData: any): Promise<User> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const newUser: User = {
                    id: `u${USERS_MOCK.length + 1}`,
                    username: userData.username,
                    name: userData.name,
                    role: userData.role,
                    assignedSiteId: userData.assignedSiteId
                };
                USERS_MOCK.push(newUser);
                resolve(newUser);
            }, 800);
        });
    }
};

const USERS_MOCK: User[] = [
    { id: 'u1', username: 'admin', name: 'Carlos Admin', role: UserRole.ADMIN },
    { id: 'u2', username: 'director', name: 'Ana Directora', role: UserRole.DIRECTOR },
    { id: 'u3', username: 'obra', name: 'Juan Residente', role: UserRole.SITE_MANAGER, assignedSiteId: SITES[0].id },
    { id: 'u4', username: 'compras', name: 'Maria Compras', role: UserRole.PURCHASING }
];
