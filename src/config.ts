// Everything personal lives here. Edit freely.

export const config = {
  /** Signs the little notes. */
  from: "me",

  /** Tiny messages from you, found in shells. They're shown in order, then shuffled. */
  shellMessages: [
    "I think about you a completely normal amount. (I don't. It's a lot.)",
    "If I were a sea cow, I'd share my seagrass with you. That's huge in sea cow culture.",
    "Reminder: you are extremely cute. This is a scientific observation.",
    "You make every day feel like a sunny afternoon in shallow water.",
    "I'd swim very slowly across an entire ocean for you. Mostly because that's the only speed I have.",
    "Luisa says hi. I say I love you.",
    "Being with you is my favourite thing. Second favourite: watching you boop a sea cow.",
    "Whatever today was like — you did great.",
  ],

  /** Shown when she taps the starfish Luisa brings back. */
  manateeFacts: [
    "Manatees are closely related to elephants. Luisa is basically a tiny underwater elephant.",
    "Manatees have fingernails on their flippers. Luisa keeps hers very tidy.",
    "A manatee can eat around 10% of its body weight in seagrass a day. Luisa would like more, please.",
    "Manatees replace their teeth their whole lives — new ones roll in from the back like a conveyor belt.",
    "Manatees use their bristly lips like hands to grab food.",
    "Manatees can't turn their heads — they turn their whole body instead. Very dramatic.",
    "Sailors used to mistake manatees for mermaids. Honestly? Fair.",
  ],

  /** Luisa hands over a flower when the boop count reaches one of these, then every 100. */
  flowerAtBoops: [10, 50],
  flowerNote: "For you. Luisa picked it herself. It took her forty minutes and she's very proud.",

  /**
   * Days when Luisa wears her party hat. "MM-DD".
   * TODO: add her birthday and your anniversary.
   */
  specialDays: [
    { date: "01-01", message: "Happy New Year! Luisa stayed up for this." },
    { date: "02-14", message: "Happy Valentine’s Day. Luisa is your valentine. So am I." },
    { date: "09-07", message: "It’s World Manatee Day! Luisa is insufferable about it." },
    { date: "12-24", message: "Merry Christmas! Luisa wrapped a seagrass for you." },
    {
      date: "12-31",
      message: "Last day of the year. Luisa would like to spend the next one with you too.",
    },
    // { date: "MM-DD", message: "Happy birthday! Luisa baked you a seagrass cake." },
    // { date: "MM-DD", message: "Happy anniversary. Luisa was there. (Luisa was not there.)" },
  ],

  /** Local hours that count as night: the sea goes dark and Luisa gets sleepy faster. */
  night: { from: 21, to: 6 },
} as const;
