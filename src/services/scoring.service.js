function outcome(homeScore, awayScore) {
  if (homeScore === awayScore) return 'draw';
  return homeScore > awayScore ? 'home' : 'away';
}

function calculateBasePoints(prediction, match) {
  if (prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore) {
    return { basePoints: 5, reason: 'exact' };
  }
  if (outcome(prediction.homeScore, prediction.awayScore) === outcome(match.homeScore, match.awayScore)) {
    return { basePoints: 3, reason: 'winner' };
  }
  if (
    Math.abs(prediction.homeScore - prediction.awayScore)
    === Math.abs(match.homeScore - match.awayScore)
  ) {
    return { basePoints: 2, reason: 'difference' };
  }
  return { basePoints: 0, reason: 'miss' };
}

function calculatePredictionPoints(prediction, match) {
  if (match.status !== 'finished') return null;
  const { basePoints, reason } = calculateBasePoints(prediction, match);
  const hoursBeforeMatch = (new Date(match.startsAt) - new Date(prediction.createdAt)) / 3600000;
  const earlyBonus = hoursBeforeMatch > 24 ? 1 : 0;
  return {
    basePoints,
    earlyBonus,
    totalPoints: basePoints + earlyBonus,
    reason,
  };
}

function calculateRanking(users, matches, predictions) {
  const finishedMatches = matches
    .filter((match) => match.status === 'finished')
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

  return users.map((user) => {
    let points = 0;
    let correctStreak = 0;
    let streakBonus = 0;
    const userPredictions = predictions.filter((prediction) => prediction.userId === user.id);

    for (const match of finishedMatches) {
      const prediction = userPredictions.find((item) => item.matchId === match.id);
      const score = prediction && calculatePredictionPoints(prediction, match);
      if (score) {
        points += score.totalPoints;
        // La racha exige "al menos el ganador" (3 pts): un acierto de solo
        // diferencia de goles (2 pts) no la mantiene.
        if (score.basePoints >= 3) {
          correctStreak += 1;
          if (correctStreak % 3 === 0) {
            points += 2;
            streakBonus += 2;
          }
        } else {
          correctStreak = 0;
        }
      } else {
        correctStreak = 0;
      }
    }
    return {
      userId: user.id,
      name: user.name,
      points,
      streakBonus,
    };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

module.exports = {
  calculatePredictionPoints,
  calculateRanking,
};
