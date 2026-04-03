import { useEffect, useState } from 'react';
import useNotificationStore from '../../store/notificationStore';
import api from '../../services/api';
import './ActivityFeed.css';

export default function ActivityFeed() {
  const { feed, setFeed } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const { data } = await api.get('/logs/feed');
        useNotificationStore.setState({ feed: data.data });
      } catch {}
      setLoading(false);
    };
    if (feed.length === 0) fetchFeed();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="activity-feed">
      <h3 className="activity-feed__title">⚡ Live Activity</h3>
      {loading ? (
        <p className="activity-feed__empty">Loading activity...</p>
      ) : feed.length === 0 ? (
        <p className="activity-feed__empty">No recent activity in your branch</p>
      ) : (
        <div className="activity-feed__list">
          {feed.map((item, i) => (
            <div key={i} className="activity-feed__item">
              <div className="activity-feed__avatar">
                {item.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="activity-feed__content">
                <span className="activity-feed__name">{item.name}</span>
                <span className="activity-feed__summary">{item.summary}</span>
              </div>
              <span className="activity-feed__time">
                {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
