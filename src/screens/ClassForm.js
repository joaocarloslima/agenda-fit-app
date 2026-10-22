import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LEVELS, link, MODALITIES } from '../api';
import { Button, Chips, ErrorBox, Field } from '../components/ui';
import { colors } from '../theme';

const EMPTY = {
  title: '',
  modality: 'YOGA',
  level: 'BEGINNER',
  instructor: '',
  startsAt: '',
  durationMinutes: '60',
  capacity: '15',
};

// Cadastro (POST no link create da página) e edição (PUT no link update da aula)
export default function ClassForm({ api, visible, gymClass, createHref, onClose, onSaved }) {
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const editing = !!gymClass;

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setValues(
      gymClass
        ? {
            title: gymClass.title,
            modality: gymClass.modality,
            level: gymClass.level,
            instructor: gymClass.instructor,
            startsAt: (gymClass.startsAt ?? '').slice(0, 16),
            durationMinutes: String(gymClass.durationMinutes),
            capacity: String(gymClass.capacity),
          }
        : EMPTY,
    );
  }, [visible, gymClass]);

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));

  async function save() {
    setSaving(true);
    setError(null);
    const startsAt = values.startsAt.trim();
    const body = {
      title: values.title.trim(),
      modality: values.modality,
      level: values.level,
      instructor: values.instructor.trim(),
      startsAt: startsAt.length === 16 ? `${startsAt}:00` : startsAt,
      durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : null,
      capacity: values.capacity ? Number(values.capacity) : null,
    };
    try {
      const href = editing ? link(gymClass, 'update') : createHref;
      if (!href) throw new Error('Sem o link para esta ação: a API não autorizou.');
      const saved = editing ? await api.put(href, body) : await api.post(href, body);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>{editing ? 'Editar aula' : 'Nova aula'}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Título" value={values.title} onChangeText={set('title')} placeholder="Yoga ao amanhecer" />
          <Text style={styles.label}>Modalidade</Text>
          <Chips options={MODALITIES} value={values.modality} onChange={set('modality')} />
          <Text style={styles.label}>Nível</Text>
          <Chips options={LEVELS} value={values.level} onChange={set('level')} />
          <Field label="Instrutor" value={values.instructor} onChangeText={set('instructor')} placeholder="Carla Mendes" />
          <Field
            label="Início"
            hint="Formato AAAA-MM-DDTHH:MM, ex.: 2026-12-01T07:30"
            value={values.startsAt}
            onChangeText={set('startsAt')}
            autoCapitalize="none"
            placeholder="2026-12-01T07:30"
          />
          <View style={styles.row}>
            <Field
              label="Duração (min)"
              value={values.durationMinutes}
              onChangeText={set('durationMinutes')}
              keyboardType="number-pad"
            />
            <Field label="Vagas" value={values.capacity} onChangeText={set('capacity')} keyboardType="number-pad" />
          </View>
          {error && <ErrorBox message={error} />}
          <Button title={editing ? 'Salvar alterações' : 'Cadastrar aula'} onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  close: { color: colors.muted, fontSize: 22 },
  content: { padding: 20, gap: 14, paddingBottom: 60 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
});
