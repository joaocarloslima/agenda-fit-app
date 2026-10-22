import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { decodeToken } from '../api';
import { Button, ErrorBox, Field, Segmented } from '../components/ui';
import { colors } from '../theme';

const MODES = [
  { value: 'login', label: 'Entrar', caption: '/auth/login' },
  { value: 'register', label: 'Criar conta', caption: '/auth/register' },
];

// usuários do DataLoader, para testar rápido
const TEST_USERS = [
  { label: 'Admin', email: 'admin@fit.com', password: 'admin123' },
  { label: 'Ana', email: 'ana@fit.com', password: 'ana123' },
  { label: 'Bruno', email: 'bruno@fit.com', password: 'bruno123' },
];

export default function AccountScreen({ api, session, onLogin, onLogout }) {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));

  async function login(credentials) {
    const response = await api.login(credentials);
    if (!response?.token) {
      throw new Error('Resposta fora do contrato: o login deveria devolver {"token", "expiresIn"}.');
    }
    const payload = decodeToken(response.token);
    if (!payload) throw new Error('O token recebido não é um JWT válido.');
    onLogin({ token: response.token, expiresIn: response.expiresIn, payload });
  }

  async function submit(credentials) {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register' && !credentials) {
        await api.register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      }
      await login(credentials ?? { email: values.email.trim(), password: values.password });
      setValues({ name: '', email: '', password: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    const { payload } = session;
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{payload.name ?? payload.sub}</Text>
          <Text style={styles.muted}>{payload.sub}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{payload.role ?? 'sem role'}</Text>
          </View>
          {expiresAt && (
            <Text style={styles.small}>
              Token válido até {expiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <Text style={styles.note}>
          O app não usa a role para esconder botões: ele mostra cada ação só quando a API manda o link dela. Entre
          com usuários diferentes e compare os _links no detalhe de uma aula.
        </Text>
        <Button title="Sair" variant="secondary" onPress={onLogout} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Segmented
        options={MODES}
        value={mode}
        onChange={(value) => {
          setMode(value);
          setError(null);
        }}
      />
      {mode === 'register' && <Field label="Nome" value={values.name} onChangeText={set('name')} />}
      <Field
        label="E-mail"
        value={values.email}
        onChangeText={set('email')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <Field label="Senha" value={values.password} onChangeText={set('password')} secureTextEntry />
      {error && <ErrorBox message={error} />}
      <Button title={mode === 'login' ? 'Entrar' : 'Criar conta e entrar'} onPress={() => submit()} loading={loading} />

      {mode === 'login' && (
        <View style={styles.quick}>
          <Text style={styles.small}>Entrar como usuário de teste</Text>
          <View style={styles.row}>
            {TEST_USERS.map((user) => (
              <Button
                key={user.email}
                title={user.label}
                variant="secondary"
                style={{ flex: 1 }}
                disabled={loading}
                onPress={() => submit({ email: user.email, password: user.password })}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  card: {
    gap: 6,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 15 },
  small: { color: colors.muted, fontSize: 13 },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  roleBadge: {
    alignSelf: 'flex-start',
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  roleText: { color: colors.accentText, fontWeight: '700', fontSize: 13 },
  quick: { gap: 8, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
});
