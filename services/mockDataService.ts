
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
  { sku: "017197", name: "INVERSOR HUAWEI SUN2000 80K-MGL0 220V", qty: 2, val: 37539600 }
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

// --- POPULATE DATA ---
const populateDemo = () => {
    // 1. POPULATE TOOLS
    const toolTemplates = [
        { name: 'Taladro Percutor 1/2"', brand: 'Bosch', category: 'ELECTRICA' as const },
        { name: 'Amoladora Angular 4-1/2"', brand: 'Makita', category: 'ELECTRICA' as const },
        { name: 'Multímetro Digital True RMS', brand: 'Fluke', category: 'MEDICION' as const },
        { name: 'Pinza Voltamperimétrica', brand: 'Fluke', category: 'MEDICION' as const },
        { name: 'Martillo Demoledor 15Kg', brand: 'Hilti', category: 'ELECTRICA' as const },
        { name: 'Ponchadora Hidráulica 12 Ton', brand: 'Burndy', category: 'ELECTRICA' as const }
    ];

    for (let i = 0; i < 45; i++) {
        const template = toolTemplates[i % toolTemplates.length];
        const site = SITES[Math.floor(Math.random() * SITES.length)];
        const statusRand = Math.random();
        let status: ToolStatus = ToolStatus.OPERATIVA;
        if (statusRand > 0.9) status = ToolStatus.MANTENIMIENTO;
        else if (statusRand > 0.95) status = ToolStatus.REPARACION;

        let nextMaintDays = (i % 8 === 0) ? -Math.floor(Math.random() * 5 + 1) : Math.floor(Math.random() * 60 + 5);

        TOOLS_MOCK.push({
            id: `tool-${i + 1}`,
            name: `${template.name} #${i + 101}`,
            serialNumber: `SN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            brand: template.brand,
            siteId: site.id,
            purchaseDate: daysAgo(Math.floor(Math.random() * 400 + 100)),
            warrantyExpirationDate: daysForward(Math.floor(Math.random() * 200 + 30)),
            nextMaintenanceDate: daysForward(nextMaintDays),
            status: status,
            category: template.category
        });
    }

    // 2. POPULATE INVENTORY WITH ~50% HEALTH TARGET
    // To get ~50% Health:
    // - High Dead Stock Rate (~40% of value stagnant)
    // - Moderate Stockout Rate (~10% of items)
    // - Low ITR (Turnover)
    
    ITEMS.forEach((item, itemIdx) => {
        const itemSites = SITES.slice(0, 8); 
        itemSites.forEach((site, siteIdx) => {
            const isWarehouse = site.type === SiteType.BODEGA_CENTRAL;
            
            // INDUCE STAGNATION: If item index is even, make it old (Aging > 90 days)
            const isStagnant = itemIdx % 2 === 0;
            const agingDays = isStagnant ? 95 + Math.floor(Math.random() * 60) : 5 + Math.floor(Math.random() * 20);
            
            // INDUCE STOCKOUTS: Every 5th item has low qty
            const isStockout = itemIdx % 5 === 0 && !isWarehouse;
            const baseQty = isWarehouse ? 1000 : (isStockout ? 2 : 50 + Math.floor(Math.random() * 150));
            
            // Current Stock
            INVENTORY_MOCK.push({
                id: `inv-${item.id}-${site.id}`,
                itemId: item.id,
                siteId: site.id,
                quantity: baseQty,
                lastMovedDate: daysAgo(agingDays)
            });

            // Historical Transactions (Rotation)
            // If stagnant, few or no consumption transactions recently
            if (!isStagnant) {
                for (let d = 1; d <= 3; d++) {
                    TRANSACTIONS_MOCK.push({
                        id: `tx-${item.id}-${site.id}-${d}`,
                        itemId: item.id,
                        siteId: site.id,
                        quantity: Math.floor(baseQty * 0.1),
                        date: daysAgo(d * 10),
                        type: 'CONSUMPTION'
                    });
                }
            } else {
                // Stagnant items only have entries from 4 months ago
                TRANSACTIONS_MOCK.push({
                    id: `tx-old-${item.id}-${site.id}`,
                    itemId: item.id,
                    siteId: site.id,
                    quantity: baseQty,
                    date: daysAgo(120),
                    type: 'ENTRY'
                });
            }

            // Project Progress
            if (!isWarehouse && itemIdx % 3 === 0) {
                PROGRESS_MOCK.push({
                    id: `prog-${item.id}-${site.id}`,
                    siteId: site.id,
                    itemId: item.id,
                    quantityInstalled: Math.floor(baseQty * 0.5),
                    lastReportDate: daysAgo(2)
                });
            }
        });
    });

    // 3. POPULATE MOVEMENTS
    const batch1Id = 'BATCH-DEMO-001';
    for (let i = 0; i < 4; i++) {
        MOVEMENTS_MOCK.push({
            id: `mov-p-${i}`,
            batchId: batch1Id,
            itemId: ITEMS[i].id,
            fromSiteId: SITES[0].id,
            toSiteId: SITES[2].id,
            quantity: 100 + (i * 10),
            requestDate: daysAgo(1),
            requesterId: 'u3',
            status: 'PENDING'
        });
    }

    MOVEMENTS_MOCK.push({
        id: `mov-r-1`,
        batchId: 'BATCH-DEMO-003',
        itemId: ITEMS[10].id,
        fromSiteId: SITES[0].id,
        toSiteId: SITES[4].id,
        quantity: 1000,
        requestDate: daysAgo(5),
        requesterId: 'u3',
        status: 'REJECTED',
        approvalDate: daysAgo(4),
        rejectionReason: 'Cantidad excede el stock disponible en bodega origen.'
    });
};

// Execute population
populateDemo();

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
    { id: 'u3', username: 'obra', name: 'Juan Residente', role: UserRole.SITE_MANAGER, assignedSiteId: SITES[2].id },
    { id: 'u4', username: 'compras', name: 'Maria Compras', role: UserRole.PURCHASING }
];
