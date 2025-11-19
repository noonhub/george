import React, { useMemo } from 'react';
import type { EpisodeResult } from '../types';
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface StatsProps {
  stats: EpisodeResult[];
  maxEpisodes: number;
}

const Stats: React.FC<StatsProps> = ({ stats, maxEpisodes }) => {
  const processedStats = useMemo(() => {
    if (stats.length === 0) {
      return {
        bestEpisode: null,
        averageReward: 0,
        successRate: 0,
        chartData: [],
        cohortData: [],
        rollingWindow: 0,
        trend: { rewardDelta: 0, successDelta: 0, window: 0 },
      };
    }

    const bestEpisode = stats.reduce((best, current) =>
      current.totalReward > best.totalReward ? current : best,
    );

    const totalRewardSum = stats.reduce((sum, s) => sum + s.totalReward, 0);
    const averageReward = totalRewardSum / stats.length;

    const successCount = stats.filter(s => s.status === 'SUCCESS').length;
    const successRate = (successCount / stats.length) * 100;

    const baseRollingWindow = stats.length > 800 ? 150 : stats.length > 400 ? 100 : 50;
    const rollingWindow = Math.max(1, Math.min(baseRollingWindow, stats.length));

    const cohortSize = stats.length > 1200 ? 200 : stats.length > 600 ? 100 : 50;

    const chartData = stats.map((s, index, arr) => {
      const start = Math.max(0, index - rollingWindow + 1);
      const windowSlice = arr.slice(start, index + 1);
      const movingAvgReward =
        windowSlice.reduce((sum, item) => sum + item.totalReward, 0) / windowSlice.length;
      const movingSuccessRate =
        (windowSlice.filter(item => item.status === 'SUCCESS').length / windowSlice.length) * 100;

      return {
        episode: s.episode,
        reward: parseFloat(s.totalReward.toFixed(2)),
        movingAvgReward: parseFloat(movingAvgReward.toFixed(2)),
        movingSuccessRate: parseFloat(movingSuccessRate.toFixed(2)),
        steps: s.steps,
        status: s.status,
      };
    });

    const cohortData: Array<{
      midpoint: number;
      startEpisode: number;
      endEpisode: number;
      successRate: number;
      avgReward: number;
    }> = [];

    for (let i = 0; i < stats.length; i += cohortSize) {
      const bucket = stats.slice(i, i + cohortSize);
      if (bucket.length === 0) continue;
      const startEpisode = bucket[0].episode;
      const endEpisode = bucket[bucket.length - 1].episode;
      const bucketReward = bucket.reduce((sum, item) => sum + item.totalReward, 0) / bucket.length;
      const bucketSuccess =
        (bucket.filter(item => item.status === 'SUCCESS').length / bucket.length) * 100;

      cohortData.push({
        midpoint: Math.round((startEpisode + endEpisode) / 2),
        startEpisode,
        endEpisode,
        avgReward: parseFloat(bucketReward.toFixed(2)),
        successRate: parseFloat(bucketSuccess.toFixed(2)),
      });
    }

    const trendWindow = Math.max(1, Math.min(Math.floor(stats.length / 3), rollingWindow));
    const earlyWindow = stats.slice(0, trendWindow);
    const recentWindow = stats.slice(-trendWindow);

    const avgRewardForWindow = (episodes: EpisodeResult[]) =>
      episodes.length === 0
        ? 0
        : episodes.reduce((sum, episode) => sum + episode.totalReward, 0) / episodes.length;

    const avgSuccessForWindow = (episodes: EpisodeResult[]) =>
      episodes.length === 0
        ? 0
        : (episodes.filter(episode => episode.status === 'SUCCESS').length / episodes.length) * 100;

    const rewardDelta = avgRewardForWindow(recentWindow) - avgRewardForWindow(earlyWindow);
    const successDelta = avgSuccessForWindow(recentWindow) - avgSuccessForWindow(earlyWindow);

    return {
      bestEpisode,
      averageReward,
      successRate,
      chartData,
      cohortData,
      rollingWindow,
      trend: { rewardDelta, successDelta, window: trendWindow },
    };
  }, [stats]);

  const { bestEpisode, averageReward, successRate, chartData, cohortData, rollingWindow, trend } =
    processedStats;

  const hasData = stats.length > 0;
  const trendLabel = !hasData
    ? '—'
    : trend.rewardDelta > 1 || trend.successDelta > 2
      ? 'Improving'
      : trend.rewardDelta < -1 && trend.successDelta < -2
        ? 'Regressing'
        : 'Plateauing';
  const trendColor = !hasData
    ? 'text-gray-500'
    : trend.rewardDelta > 0 || trend.successDelta > 0
      ? 'text-emerald-400'
      : trend.rewardDelta < 0 || trend.successDelta < 0
        ? 'text-rose-400'
        : 'text-amber-300';

  return (
    <div className="p-5 bg-[#17181b] border border-white/5 rounded-3xl shadow-xl shadow-black/30 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold text-[#42dca3] tracking-wide uppercase">
          Performance Summary
        </h3>
        {hasData && (
          <p className="text-xs text-gray-500">
            Rolling window: {rollingWindow} episodes • Brush to zoom when you have thousands of runs.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Success Rate</p>
          <p className="text-lg font-semibold text-[#42dca3]">
            {hasData ? `${successRate.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Avg. Reward</p>
          <p className="text-lg font-semibold text-gray-100">
            {hasData ? averageReward.toFixed(2) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Best Reward</p>
          <p className="text-lg font-semibold text-gray-100">
            {bestEpisode ? bestEpisode.totalReward.toFixed(2) : '—'}
          </p>
          {bestEpisode && <p className="text-xs text-gray-500">Episode {bestEpisode.episode}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Learning Trend</p>
          <p className={`text-lg font-semibold ${trendColor}`}>{trendLabel}</p>
          {hasData && (
            <p className="text-xs text-gray-500">
              {trend.rewardDelta >= 0 ? '+' : ''}
              {trend.rewardDelta.toFixed(1)} reward • {trend.successDelta >= 0 ? '+' : ''}
              {trend.successDelta.toFixed(1)}% success (last {trend.window} vs. first {trend.window})
            </p>
          )}
        </div>
      </div>

      <div className="w-full h-64 sm:h-72 lg:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="rewardGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#42dca3" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#42dca3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="episode"
              stroke="#d1d5db"
              type="number"
              domain={[1, maxEpisodes]}
              allowDataOverflow
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="reward"
              stroke="#d1d5db"
              domain={['auto', 'auto']}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="success"
              orientation="right"
              stroke="#d1d5db"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#101115',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
              }}
              labelStyle={{ color: '#E2E8F0' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine
              yAxisId="reward"
              y={0}
              stroke="rgba(226,232,240,0.25)"
              strokeDasharray="4 4"
            />
            <Area
              yAxisId="reward"
              type="monotone"
              dataKey="movingAvgReward"
              stroke="#42dca3"
              strokeWidth={2}
              fill="url(#rewardGradient)"
              fillOpacity={1}
              name={`Rolling Reward (${rollingWindow} ep)`}
              activeDot={false}
            />
            <Line
              yAxisId="reward"
              type="monotone"
              dataKey="reward"
              stroke="#10b981"
              strokeOpacity={0.4}
              dot={false}
              strokeDasharray="3 6"
              name="Episode Reward"
            />
            <Line
              yAxisId="success"
              type="monotone"
              dataKey="movingSuccessRate"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name="Rolling Success %"
            />
            {chartData.length > 75 && (
              <Brush
                dataKey="episode"
                height={24}
                stroke="#42dca3"
                fill="rgba(17,24,39,0.6)"
                travellerWidth={12}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {cohortData.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Cohort Success Snapshot</p>
          <div className="w-full mt-2 h-48 sm:h-56 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={cohortData}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  dataKey="midpoint"
                  domain={[1, maxEpisodes]}
                  stroke="#d1d5db"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value: number) => `#${Math.round(value)}`}
                />
                <YAxis
                  yAxisId="success"
                  stroke="#d1d5db"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="reward"
                  orientation="right"
                  stroke="#d1d5db"
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101115',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  labelFormatter={(_, payload) => {
                    const range = payload && payload[0] ? payload[0].payload : null;
                    return range
                      ? `Episodes ${range.startEpisode}-${range.endEpisode}`
                      : 'Cohort';
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  yAxisId="success"
                  dataKey="successRate"
                  fill="rgba(96,165,250,0.5)"
                  stroke="#60a5fa"
                  radius={[4, 4, 0, 0]}
                  name="Success %"
                />
                <Line
                  yAxisId="reward"
                  type="monotone"
                  dataKey="avgReward"
                  stroke="#f0b90b"
                  strokeWidth={2}
                  dot={{ stroke: '#f0b90b', strokeWidth: 2, r: 2 }}
                  name="Average Reward"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;
