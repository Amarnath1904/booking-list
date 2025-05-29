// Room related types that can be used on both client and server

export enum PricingType {
  ROOM = 'room',
  PERSON = 'person'
}

export enum RoomCapacity {
  SINGLE = 'Single room',
  DOUBLE = 'Double room',
  TRIPLE = 'Triple room',
  FOUR = 'Four room',
  DORMITORY = 'Dormitory'
}

export interface RoomData {
  propertyId: string;
  pricingType: PricingType;
  roomCategory?: string;
  ratePerRoom?: number;
  capacity: RoomCapacity;
  amenities: string[];
  images: string[];
  extraPersonCharge?: number;
  agentCommission?: number;
  advanceAmount?: number;
}
