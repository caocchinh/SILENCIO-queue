import { EmailTicketInfo, EmailHauntedHouseTicketInfo } from "./types";

export const UNSUPPORT_TICKET_TYPE = ["Juggler"];
export const SELECTION_DEADLINE = new Date("2025-10-27T11:00:00+07:00");
export const EMAIL_BANNER =
  "https://drive.google.com/uc?id=1f_NVZZ3XSMnIWZr6J5jifmAEOa77ezVt";
export const SILENCIO_HAUNTED_HOUSE_QUEUE_MANAGER_URL =
  "https://silencio-vcp.vercel.app";
export const REMIND_DEADLINE_TEXT = "11h trưa ngày 27/10/2025";
export const CHECKIN_WEBSITE = "https://silencio-checkin.vercel.app";

export const TUTORIAL_LINK =
  "https://www.canva.com/design/DAG3CqAMfcw/sDN8XO0OuVAWQwWheZRjjg/edit?utm_content=DAG3CqAMfcw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton";

export const EMAIL_TICKET_INFO: EmailTicketInfo = {
  Ringmaster: {
    checkInTime: "5:00 PM đến 7:30 PM",
    ticketImageUrl:
      "https://vteam-online-ticket.vercel.app/assets/ringmaster.webp",
    borderColor: "rgba(124, 29, 68,1)",
    backgroundColor: "rgba(124, 29, 68,0.05)",
    concertIncluded: true,
  },
  Juggler: {
    checkInTime: "6:00 PM đến 7:30 PM",
    ticketImageUrl:
      "https://vteam-online-ticket.vercel.app/assets/juggler.webp",
    concertIncluded: true,
    borderColor: "rgba(96, 37, 37,1)",
    backgroundColor: "rgba(96, 37, 37,0.05)",
  },
  Jester: {
    checkInTime: "5:00 PM đến 7:30 PM",
    ticketImageUrl: "https://vteam-online-ticket.vercel.app/assets/jester.webp",
    borderColor: "rgba(69, 62, 103,1)",
    backgroundColor: "rgba(69, 62, 103,0.05)",
    concertIncluded: false,
  },
  Tamer: {
    checkInTime: "5:00 PM đến 7:30 PM",
    ticketImageUrl: "https://vteam-online-ticket.vercel.app/assets/tamer.webp",
    borderColor: "rgba(87, 117, 161,1)",
    backgroundColor: "rgba(87, 117, 161,0.05)",
    concertIncluded: false,
  },
};

export const EMAIL_HAUNTED_HOUSE_TICKET_INFO: EmailHauntedHouseTicketInfo = {
  "Melody of Darkness": {
    ticketImageUrl:
      "https://vteam-online-ticket.vercel.app/assets/melody_of_darkness.webp",
    borderColor: "rgba(179, 93, 0, 1)",
    backgroundColor: "rgba(179, 93, 0,0.05)",
  },
  "Orphaned Soul": {
    ticketImageUrl:
      "https://vteam-online-ticket.vercel.app/assets/orphaned_soul.webp",
    borderColor: "rgba(120, 12, 42,1)",
    backgroundColor: "rgba(120, 12, 42,0.05)",
  },

  "Whispering Sewers": {
    ticketImageUrl:
      "https://vteam-online-ticket.vercel.app/assets/whispering_sewers.webp",
    borderColor: "rgba(22, 31, 59,1)",
    backgroundColor: "rgba(22, 31, 59,0.05)",
  },
  Twins: {
    ticketImageUrl: "https://vteam-online-ticket.vercel.app/assets/twins.webp",
    borderColor: "rgba(75, 27, 123, 1)",
    backgroundColor: "rgba(75, 27, 123, 0.05)",
  },
};
