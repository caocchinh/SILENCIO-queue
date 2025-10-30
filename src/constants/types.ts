export interface Student {
  studentId: string;
  name: string;
  email: string;
  homeroom: string;
  ticketType: string;
}

export type TicketType =
  | "Ringmaster"
  | "Juggler"
  | "Jester"
  | "Tamer"
  | "Jester - Vé CTV";

export type HauntedHouseType =
  | "Melody of Darkness"
  | "Orphaned Soul"
  | "Whispering Sewers"
  | "Twins";

export interface TicketInfo {
  checkInTime: string;
  ticketImageUrl: string;
  borderColor: string;
  backgroundColor: string;
  concertIncluded: boolean;
}

export interface HauntedHouseInfo {
  ticketImageUrl: string;
  borderColor: string;
  backgroundColor: string;
}

export type EmailTicketInfo = Record<TicketType, TicketInfo>;
export type EmailHauntedHouseTicketInfo = Record<
  HauntedHouseType,
  HauntedHouseInfo
>;
