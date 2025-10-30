import '../styles/StatsCard.css';

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

export const StatsCard = ({ title, value, icon, color }: StatsCardProps) => {
  return (
    <div className={`stats-card stats-card-${color}`}>
      <div className="stats-icon">{icon}</div>
      <div className="stats-content">
        <p className="stats-title">{title}</p>
        <h2 className="stats-value">{value.toLocaleString()}</h2>
      </div>
    </div>
  );
};
