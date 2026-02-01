/**
 * Know Yourself Better - Sleep vs Emotions
 * Horizontal grouped bars: More sleep vs Less sleep per emotion.
 * Clean layout with vertical legend.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Svg, { Rect } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";
import { GlassCard } from "../ui/GlassCard";
import { typography, spacing, borderRadius } from "../../constants/theme";
import { api } from "../../api/client";
import type { SleepVsEmotionsResponse } from "../../api/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HORIZONTAL_PADDING = 24 * 2;
const CARD_PADDING = 16 * 2;
const LEGEND_WIDTH = 80;
const CHART_WIDTH = Math.max(200, SCREEN_WIDTH - HORIZONTAL_PADDING - CARD_PADDING - LEGEND_WIDTH - 24);
const ROW_HEIGHT = 28;
const BAR_HEIGHT = 14;
const LABEL_WIDTH = 68;
const BAR_AREA = CHART_WIDTH - LABEL_WIDTH - 8;

interface KnowYourselfBetterCardProps {
  userId: number;
}

export const KnowYourselfBetterCard: React.FC<KnowYourselfBetterCardProps> = ({
  userId,
}) => {
  const { theme } = useTheme();
  const [data, setData] = useState<SleepVsEmotionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.insights.getSleepVsEmotions(userId);
      setData(res);
    } catch (e) {
      setError("Could not load data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <GlassCard style={styles.card} variant="default" padding="md">
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Know yourself better
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]} numberOfLines={2}>
          Sleep vs emotions — more sleep or less, what do you feel?
        </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.chartEmpty}>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {error}
          </Text>
        </View>
      ) : !data || data.groups.length === 0 ? (
        <View style={styles.chartEmpty}>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Add health data (sleep) and journal entries to discover patterns
          </Text>
        </View>
      ) : (
        <View style={styles.chartContainer}>
          <View style={styles.chartRow}>
            <SleepVsEmotionsChart data={data} theme={theme} />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.positive }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  More sleep
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  Less sleep
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
      </View>
    </GlassCard>
  );
};

interface ChartProps {
  data: SleepVsEmotionsResponse;
  theme: { colors: Record<string, string> };
}

const SleepVsEmotionsChart: React.FC<ChartProps> = ({ data, theme }) => {
  const moreGroup = data.groups.find((g) => g.label === "More sleep");
  const lessGroup = data.groups.find((g) => g.label === "Less sleep");

  const maxVal = Math.max(
    1,
    ...data.emotionOrder.map(
      (e) => (moreGroup?.emotions[e] || 0) + (lessGroup?.emotions[e] || 0)
    )
  );

  const chartHeight = data.emotionOrder.length * ROW_HEIGHT;
  const barStartX = LABEL_WIDTH + 8;
  const maxBarWidth = BAR_AREA / 2 - 6;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.chartWrapper}>
      <Svg width={CHART_WIDTH} height={chartHeight}>
        {data.emotionOrder.map((emotion, i) => {
          const moreCount = moreGroup?.emotions[emotion] || 0;
          const lessCount = lessGroup?.emotions[emotion] || 0;
          const rowY = i * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

          const moreWidth = maxBarWidth * (moreCount / maxVal);
          const lessWidth = maxBarWidth * (lessCount / maxVal);

          return (
            <React.Fragment key={emotion}>
              {moreCount > 0 && (
                <Rect
                  x={barStartX}
                  y={rowY}
                  width={Math.max(moreWidth, 4)}
                  height={BAR_HEIGHT}
                  rx={4}
                  ry={4}
                  fill={theme.colors.positive}
                  opacity={0.9}
                />
              )}
              {lessCount > 0 && (
                <Rect
                  x={barStartX + BAR_AREA / 2 + 4}
                  y={rowY}
                  width={Math.max(lessWidth, 4)}
                  height={BAR_HEIGHT}
                  rx={4}
                  ry={4}
                  fill={theme.colors.secondary}
                  opacity={0.85}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={[styles.rows, { height: chartHeight }]}>
        {data.emotionOrder.map((emotion) => (
          <View key={emotion} style={styles.row}>
            <Text
              style={[styles.emotionLabel, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
            </Text>
            <View style={styles.barArea} />
          </View>
        ))}
      </View>

      {(moreGroup?.sleepHours != null || lessGroup?.sleepHours != null) && (
        <View style={[styles.sleepHint, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.sleepText, { color: theme.colors.textMuted }]} numberOfLines={2}>
            More sleep ~{moreGroup?.sleepHours ?? "—"}h · Less sleep ~{lessGroup?.sleepHours ?? "—"}h
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  cardContent: {
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing["2xl"],
    alignItems: "center",
  },
  chartEmpty: {
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    textAlign: "center",
  },
  chartContainer: {
    width: "100%",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    maxWidth: "100%",
    flexWrap: "wrap",
  },
  chartWrapper: {
    width: CHART_WIDTH,
    maxWidth: "100%",
    flexShrink: 1,
    position: "relative",
    minWidth: 0,
  },
  legend: {
    paddingTop: 4,
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
    flexShrink: 0,
    maxWidth: LEGEND_WIDTH,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: LEGEND_WIDTH,
    minWidth: 0,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
    flexShrink: 1,
    maxWidth: LEGEND_WIDTH - 14,
  },
  rows: {
    position: "absolute",
    left: 0,
    top: 0,
    width: CHART_WIDTH - 16,
    pointerEvents: "none",
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  emotionLabel: {
    width: LABEL_WIDTH,
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
  },
  barArea: {
    flex: 1,
  },
  sleepHint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    width: "100%",
    maxWidth: "100%",
  },
  sleepText: {
    fontSize: 11,
    flexShrink: 1,
  },
});
