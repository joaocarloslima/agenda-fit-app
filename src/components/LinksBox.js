import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Mostra os _links recebidos: ajuda a ver que a resposta muda conforme quem está logado
export default function LinksBox({ resource }) {
  const links = Object.entries(resource?._links ?? {});
  return (
    <View style={styles.box}>
      <Text style={styles.title}>_links recebidos</Text>
      {links.length === 0 && <Text style={styles.missing}>Nenhum link. Resposta fora do contrato.</Text>}
      {links.map(([rel, value]) => (
        <View key={rel} style={styles.row}>
          <Text style={styles.rel}>{rel}</Text>
          <Text style={styles.href} numberOfLines={1}>
            {value?.href}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'baseline' },
  rel: { color: colors.accent, fontSize: 13, fontWeight: '700', width: 64, fontFamily: 'monospace' },
  href: { color: colors.muted, fontSize: 12, flex: 1, fontFamily: 'monospace' },
  missing: { color: colors.danger, fontSize: 13 },
});
