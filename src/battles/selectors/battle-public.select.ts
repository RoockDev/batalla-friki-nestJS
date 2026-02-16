// Este select define los datos que se van a mostrar de la batalla
// evita exponer campos sensibles como la password
// y evita duplicar el mismo select en varios métodos 
export const battlePublicSelect = {
  id: true,
  mode: true,
  status: true,
  initiatorCurrentHp: true,
  opponentCurrentHp: true,
  turnNumber: true,
  nextTurn: true,
  initiatorUserId: true,
  opponentUserId: true,
  winnerUserId: true,
  winnerIsMachine: true,
  initiatorCharacterId: true,
  opponentCharacterId: true,
  endedAt: true,
  createdAt: true,
  initiatorUser: {
    select: {
      id: true,
      email: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
    },
  },
  opponentUser: {
    select: {
      id: true,
      email: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
    },
  },
  winnerUser: {
    select: {
      id: true,
      email: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
    },
  },
  initiatorCharacter: {
    select: {
      id: true,
      name: true,
      hp: true,
      attack: true,
      levelRequired: true,
    },
  },
  opponentCharacter: {
    select: {
      id: true,
      name: true,
      hp: true,
      attack: true,
      levelRequired: true,
    },
  },
} as const;
