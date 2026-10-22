import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDateTime, levelLabel, link, modalityLabel } from '../api';
import { SpotsBadge } from '../components/ClassCard';
import LinksBox from '../components/LinksBox';
import { Button, ErrorBox } from '../components/ui';
import { colors } from '../theme';

// Detalhe de uma aula. Busca de novo pelo link self e mostra cada ação só se o link dela existir.
export default function ClassDetail({ api, gymClass, onClose, onEdit, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(null); // 'enroll' | 'delete'
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selfHref = link(gymClass, 'self');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (!selfHref) throw new Error('Resposta fora do contrato: a aula não tem _links.self.');
      setData(await api.get(selfHref));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setData(null);
    setSuccess(null);
    setConfirmDelete(false);
    if (gymClass) load();
  }, [gymClass, api]);

  if (!gymClass) return null;

  const c = data ?? gymClass;
  const enrollHref = link(c, 'enroll');
  const updateHref = link(c, 'update');
  const deleteHref = link(c, 'delete');

  async function enroll() {
    setBusy('enroll');
    setError(null);
    try {
      await api.post(enrollHref);
      setSuccess('Inscrição confirmada!');
      onChanged();
      await load(); // a resposta nova já não traz o link enroll
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy('delete');
    setError(null);
    try {
      await api.remove(deleteHref);
      onChanged();
      onClose();
    } catch (e) {
      setError(e.message);
      setConfirmDelete(false);
    } finally {
      setBusy(null);
    }
  }

  // por que não há botão de inscrição? (só para orientar quem usa o app)
  let enrollHint = null;
  if (!enrollHref && data) {
    if (!api.loggedIn) enrollHint = 'Entre na aba Conta para se inscrever.';
    else if (c.availableSpots <= 0) enrollHint = 'Aula lotada.';
    else enrollHint = 'Você já está inscrito nesta aula.';
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.modality}>
                  {modalityLabel(c.modality)} · {levelLabel(c.level)} · #{c.id}
                </Text>
                <Text style={styles.title}>{c.title}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            {loading && <ActivityIndicator color={colors.accent} />}
            {error && <ErrorBox message={error} onRetry={data ? undefined : load} />}
            {success && <Text style={styles.success}>✓ {success}</Text>}

            {data && (
              <>
                <View style={styles.grid}>
                  <Info label="Quando" value={formatDateTime(c.startsAt)} />
                  <Info label="Duração" value={`${c.durationMinutes} min`} />
                  <Info label="Instrutor" value={c.instructor} />
                  <View style={styles.info}>
                    <Text style={styles.infoLabel}>Vagas</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.infoValue}>
                        {c.availableSpots}/{c.capacity}
                      </Text>
                      <SpotsBadge gymClass={c} />
                    </View>
                  </View>
                </View>

                <View style={styles.actions}>
                  {enrollHref && <Button title="Inscrever-se" onPress={enroll} loading={busy === 'enroll'} />}
                  {enrollHint && <Text style={styles.hint}>{enrollHint}</Text>}
                  {updateHref && <Button title="Editar aula" variant="secondary" onPress={() => onEdit(c)} />}
                  {deleteHref && (
                    <Button
                      title={confirmDelete ? 'Toque de novo para excluir' : 'Excluir aula'}
                      variant="danger"
                      onPress={remove}
                      loading={busy === 'delete'}
                    />
                  )}
                </View>

                <LinksBox resource={c} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  modality: { color: colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  close: { color: colors.muted, fontSize: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  info: {
    minWidth: '46%',
    flexGrow: 1,
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: { color: colors.muted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  actions: { gap: 10 },
  hint: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  success: { color: colors.success, fontSize: 15, fontWeight: '600' },
});
