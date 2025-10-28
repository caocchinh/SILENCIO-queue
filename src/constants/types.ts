export interface Student {
  studentId: string;
  name: string;
  email: string;
  homeroom: string;
  ticketType: string;
}

type TicketType = "Ringmaster" | "Juggler" | "Jester" | "Tamer";

type HauntedHouseType = "Melody Of Darkness" | "Orphaned Soul" | "Whispering Sewers" | "Twins";

interface TicketInfo {
  checkInTime: string;
  ticketImageUrl: string;
  borderColor: string;
  backgroundColor: string;
  concertIncluded: boolean;
}

interface HauntedHouseInfo {
  ticketImageUrl: string;
  borderColor: string;
  backgroundColor: string;
}

export type EmailTicketInfo = Record<TicketType, TicketInfo>;
export type EmailHauntedHouseTicketInfo = Record<HauntedHouseType, HauntedHouseInfo>;
