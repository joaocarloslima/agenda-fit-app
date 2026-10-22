import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { LEVELS, MODALITIES } from '../api';
import ClassCard from '../components/ClassCard';
import PagedList from '../components/PagedList';
import { Button, Chips, Field, Segmented } from '../components/ui';
import { colors } from '../theme';

const MODES = [
  { value: 'example', label: 'Exemplo', caption: '/classes/example' },
  { value: 'search', label: 'Filtros', caption: '/classes/search' },
];

const EMPTY = {
  modality: null,
  level: null,
  instructor: '',
  title: '',
  startsAfter: '',
  startsBefore: '',
  availableOnly: false,
};

// completa "2026-12-01T07:30" com segundos; aceita também só a data
function toIso(value, endOfDay) {
  const text = value.trim();
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  if (text.length === 16) return `${text}:00`;
  return text;
}

export default function SearchScreen({ api, onSelect, refreshKey }) {
  const [mode, setMode] = useState('example');
  const [filters, setFilters] = useState(EMPTY);
  const [url, setUrl] = useState(null);

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));

  function run() {
    if (mode === 'example') {
      setUrl(
        api.exampleUrl({ modality: filters.modality, level: filters.level, instructor: filters.instructor }),
      );
    } else {
      setUrl(
        api.searchUrl({
          title: filters.title,
          modality: filters.modality,
          level: filters.level,
          startsAfter: toIso(filters.startsAfter, false),
          startsBefore: toIso(filters.startsBefore, true),
          availableOnly: filters.availableOnly ? 'true' : undefined,
        }),
      );
    }
  }

  const form = (
    <View style={styles.form}>
      <Segmented
        options={MODES}
        value={mode}
        onChange={(value) => {
          setMode(value);
          setUrl(null);
        }}
      />
      <Text style={styles.label}>Modalidade</Text>
      <Chips options={MODALITIES} value={filters.modality} onChange={set('modality')} allowEmpty />
      <Text style={styles.label}>Nível</Text>
      <Chips options={LEVELS} value={filters.level} onChange={set('level')} allowEmpty />

      {mode === 'example' ? (
        <Field
          label="Instrutor (nome exato)"
          value={filters.instructor}
          onChangeText={set('instructor')}
          placeholder="Carla Mendes"
        />
      ) : (
        <>
          <Field label="Título contém" value={filters.title} onChangeText={set('title')} placeholder="express" />
          <View style={styles.row}>
            <Field
              label="A partir de"
              value={filters.startsAfter}
              onChangeText={set('startsAfter')}
              placeholder="2026-12-01T08:00"
              autoCapitalize="none"
            />
            <Field
              label="Até"
              value={filters.startsBefore}
              onChangeText={set('startsBefore')}
              placeholder="2026-12-01"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Só aulas com vaga</Text>
            <Switch
              value={filters.availableOnly}
              onValueChange={set('availableOnly')}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </>
      )}

      <View style={styles.row}>
        <Button title="Buscar" onPress={run} style={{ flex: 1 }} />
        <Button
          title="Limpar"
          variant="secondary"
          onPress={() => {
            setFilters(EMPTY);
            setUrl(null);
          }}
        />
      </View>
    </View>
  );

  if (!url) {
    return <View style={styles.idle}>{form}</View>;
  }

  return (
    <PagedList
      api={api}
      url={url}
      embeddedKey="classes"
      noun={['aula', 'aulas']}
      header={form}
      emptyText="Nenhuma aula com esses filtros."
      refreshKey={refreshKey}
      renderItem={(item) => <ClassCard gymClass={item} onPress={() => onSelect(item)} />}
    />
  );
}

const styles = StyleSheet.create({
  idle: { padding: 16 },
  form: { gap: 12, paddingBottom: 8 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
