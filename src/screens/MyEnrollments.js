import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateTime, link } from '../api';
import PagedList from '../components/PagedList';
import { Button, ErrorBox } from '../components/ui';
import { colors } from '../theme';

// GET /enrollments/me: só as inscrições do usuário logado
export default function MyEnrollments({ api, onOpenClass, onChanged, refreshKey }) {
  if (!api.loggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Entre na aba Conta para ver suas inscrições.</Text>
      </View>
    );
  }

  return (
    <PagedList
      api={api}
      url={api.myEnrollmentsUrl()}
      embeddedKey="enrollments"
      noun={['inscrição', 'inscrições']}
      emptyText="Você ainda não se inscreveu em nenhuma aula."
      refreshKey={refreshKey}
      renderItem={(item, reload) => (
        <EnrollmentCard
          api={api}
          enrollment={item}
          onOpenClass={onOpenClass}
          onCanceled={() => {
            reload();
            onChanged();
          }}
        />
      )}
    />
  );
}

function EnrollmentCard({ api, enrollment, onOpenClass, onCanceled }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const classHref = link(enrollment, 'class');
  const cancelHref = link(enrollment, 'cancel');

  async function cancel() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.remove(cancelHref);
      onCanceled();
    } catch (e) {
      setError(e.message);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Pressable
        disabled={!classHref}
        accessibilityRole="button"
        // abre o detalhe da aula pelo link "class" da inscrição
        onPress={() => onOpenClass({ id: enrollment.classId, title: enrollment.classTitle, _links: { self: { href: classHref } } })}
      >
        <Text style={styles.title}>{enrollment.classTitle}</Text>
        <Text style={styles.meta}>{formatDateTime(enrollment.startsAt)}</Text>
        <Text style={styles.small}>Inscrição #{enrollment.id}</Text>
      </Pressable>
      {error && <ErrorBox message={error} />}
      {cancelHref && (
        <Button
          title={confirm ? 'Toque de novo para cancelar' : 'Cancelar inscrição'}
          variant={confirm ? 'danger' : 'secondary'}
          onPress={cancel}
          loading={busy}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.muted, fontSize: 15, textAlign: 'center' },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 14, marginTop: 2 },
  small: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
