
export enum UserRole {
  ADMIN = 'ADMIN',
  DIRECTOR = 'DIRECTOR',
  SITE_MANAGER = 'SITE_MANAGER',
  PURCHASING = 'PURCHASING'
}

export enum SiteType {
  BODEGA_CENTRAL = 'BODEGA_CENTRAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  SOLAR = 'SOLAR',
  RESIDENTIAL = 'RESIDENTIAL'
}

export interface Site {
  id: string;
  name: string;
  type: SiteType;
  location: string;
  budget: number; 
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: 'CABLES' | 'PROTECCION' | 'TUBERIA' | 'ILUMINACION' | 'HERRAMIENTA' | 'ACCESORIOS';
  unit: string;
  cost: number;
  imageUrl: string; 
  priceHistory?: PricePoint[];
}

export interface InventoryRecord {
  id: string;
  itemId: string;
  siteId: string;
  quantity: number;
  lastMovedDate: string; 
}

export interface Transaction {
  id: string;
  itemId: string;
  siteId: string;
  quantity: number; 
  date: string;
  type: 'CONSUMPTION' | 'ENTRY' | 'TRANSFER_IN' | 'TRANSFER_OUT';
}

export interface ProjectProgress {
  id: string;
  siteId: string;
  itemId: string;
  quantityInstalled: number;
  lastReportDate: string;
}

export enum ToolStatus {
  OPERATIVA = 'OPERATIVA',
  MANTENIMIENTO = 'MANTENIMIENTO',
  REPARACION = 'REPARACION',
  BAJA = 'BAJA'
}

export interface Tool {
  id: string;
  name: string;
  serialNumber: string;
  brand: string;
  siteId: string;
  purchaseDate: string;
  warrantyExpirationDate: string;
  nextMaintenanceDate: string;
  status: ToolStatus;
  category: 'ELECTRICA' | 'MANUAL' | 'MEDICION' | 'SEGURIDAD';
}

export interface MovementRequest {
  id: string;
  batchId?: string; // New field for grouping
  itemId: string;
  fromSiteId: string;
  toSiteId: string;
  quantity: number;
  requestDate: string;
  requesterId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalDate?: string;
  rejectionReason?: string; // Reason for rejection
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  assignedSiteId?: string; 
}

export interface AppThresholds {
  stagnantDays: number;
  lowStockPercent: number;
  criticalValue: number;
}
