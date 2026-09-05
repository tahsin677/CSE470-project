import React, { useEffect, useState } from 'react'
import { Award, Star, Trophy } from '../icons'
import { gamificationApi, unwrap } from '../services/api'
import { Empty, Loading, Panel } from './shared'

/* Feature 20: Gamification */
export function GamificationFeature({ user }) {
  const [profile, setProfile] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      gamificationApi.me().then((r) => unwrap(r)).catch(() => null),
      gamificationApi.leaderboard().then((r) => unwrap(r)).catch(() => []),
    ]).then(([me, board]) => {
      setProfile(me)
      setLeaderboard(board || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  return (
    <>
      <Panel title="Achievements & points">
        {!profile ? <Empty title="gamification" hint="Complete assignments and quizzes to earn points." /> : (
          <div className="row g-4">
            <div className="col-md-4">
              <div className="kpi">
                <div><small>Total points</small><strong>{profile.points}</strong></div>
                <span><Star /></span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="kpi">
                <div><small>Level</small><strong>{profile.level}</strong></div>
                <span><Trophy /></span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="kpi">
                <div><small>Badges earned</small><strong>{profile.badges?.length || 0}</strong></div>
                <span><Award /></span>
              </div>
            </div>
            <div className="col-12">
              <h6>Your badges</h6>
              <div className="d-flex gap-2 flex-wrap">
                {(profile.badges || []).length ? profile.badges.map((b) => (
                  <span key={b.id} className="pill">{b.icon} {b.name}</span>
                )) : <p className="text-muted small">No badges yet — keep learning!</p>}
              </div>
            </div>
            {profile.stats && (
              <div className="col-12">
                <small className="text-muted">
                  {profile.stats.submissions} graded submissions · {profile.stats.quizzes} quizzes · {profile.stats.avgProgress}% avg progress
                </small>
              </div>
            )}
          </div>
        )}
      </Panel>

      {(user.role === 'student' || user.role === 'teacher') && (
        <Panel title="Leaderboard">
          {!leaderboard.length ? <Empty title="leaderboard" /> : (
            <div className="list-group list-group-flush">
              {leaderboard.map((entry, i) => (
                <div className="list-group-item px-0 d-flex justify-content-between" key={entry.userId}>
                  <span><strong>#{i + 1}</strong> {entry.name}</span>
                  <span>{entry.points} pts · Lv.{entry.level}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
