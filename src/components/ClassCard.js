import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateTime, levelLabel, link, modalityLabel } from '../api';
import { colors } from '../theme';

export function SpotsBadge({ gymClass }) {
  const full = gymClass.availableSpots <= 0;
  return (
    <View style={[styles.badge, full ? styles.badgeFull : styles.badgeOpen]}>
      <Text style={[styles.badgeText, { color: full ? colors.danger : colors.success }]}>
        {full ? 'Lotada' : `${gymClass.availableSpots} ${gymClass.availableSpots === 1 ? 'vaga' : 'vagas'}`}
      </Text>
    </View>
  );
}

export default function ClassCard({ gymClass, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={styles.top}>
        <Text style={styles.modality}>
          {modalityLabel(gymClass.modality)} · {levelLabel(gymClass.level)}
        </Text>
        <SpotsBadge gymClass={gymClass} />
      </View>
      <Text style={styles.title}>{gymClass.title}</Text>
      <Text style={styles.meta}>
        {formatDateTime(gymClass.startsAt)} · {gymClass.durationMinutes} min
      </Text>
      <View style={styles.bottom}>
        <Text style={styles.meta}>com {gymClass.instructor}</Text>
        {/* o link enroll só vem quando ESTE usuário pode se inscrever */}
        {link(gymClass, 'enroll') && <Text style={styles.canEnroll}>Disponível para você</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modality: { color: colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 14 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  canEnroll: { color: colors.success, fontSize: 13, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeOpen: { borderColor: '#1F5133', backgroundColor: '#10261A' },
  badgeFull: { borderColor: '#5B2128', backgroundColor: '#2A1416' },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
