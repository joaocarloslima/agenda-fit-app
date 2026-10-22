import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createApi, link } from './src/api';
import ClassCard from './src/components/ClassCard';
import PagedList from './src/components/PagedList';
import AccountScreen from './src/screens/AccountScreen';
import ClassDetail from './src/screens/ClassDetail';
import ClassForm from './src/screens/ClassForm';
import MyEnrollments from './src/screens/MyEnrollments';
import SearchScreen from './src/screens/SearchScreen';
import SettingsModal from './src/screens/SettingsModal';
import { colors } from './src/theme';

// No emulador Android, o computador é 10.0.2.2. No celular, troque pelo IP da rede.
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const TABS = [
  { key: 'classes', label: 'Aulas', icon: '🗓️' },
  { key: 'search', label: 'Buscar', icon: '🔎' },
  { key: 'mine', label: 'Inscrições', icon: '✅' },
  { key: 'account', label: 'Conta', icon: '👤' },
];

export default function App() {
  const [host, setHost] = useState(DEFAULT_HOST);
  const [session, setSession] = useState(null); // { token, expiresIn, payload }
  const [sessionMessage, setSessionMessage] = useState(null);
  const [tab, setTab] = useState('classes');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState(null); // aula aberta no detalhe
  const [form, setForm] = useState({ open: false, gymClass: null });
  const [pageLinks, setPageLinks] = useState({}); // _links da página de aulas (create só vem para o ADMIN)
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  // 401 com token: o token expirou ou é inválido, então a sessão acaba
  const handleUnauthorized = useCallback(() => {
    setSession(null);
    setSessionMessage('Sua sessão expirou. Entre de novo.');
  }, []);

  const api = useMemo(() => createApi(host, session?.token, handleUnauthorized), [host, session, handleUnauthorized]);
  const current = TABS.find((t) => t.key === tab);
  const createHref = link({ _links: pageLinks }, 'create');

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.title}>{current.label}</Text>
          <View style={styles.headerActions}>
            {/* o botão aparece porque a página trouxe o link create, não porque o app sabe a role */}
            {tab === 'classes' && createHref && (
              <Pressable
                onPress={() => setForm({ open: true, gymClass: null })}
                accessibilityRole="button"
                accessibilityLabel="Nova aula"
                style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.addText}>+ Nova</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setSettingsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Configurar servidor"
              style={({ pressed }) => [styles.serverChip, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.serverText} numberOfLines={1}>
                ⚙︎ {host}
              </Text>
            </Pressable>
          </View>
        </View>

        {sessionMessage && (
          <Pressable onPress={() => setSessionMessage(null)} style={styles.banner}>
            <Text style={styles.bannerText}>{sessionMessage}</Text>
          </Pressable>
        )}

        <View style={styles.content}>
          {tab === 'classes' && (
            <PagedList
              api={api}
              url={api.classesUrl()}
              embeddedKey="classes"
              noun={['aula', 'aulas']}
              refreshKey={refreshKey}
              onPageLinks={setPageLinks}
              renderItem={(item) => <ClassCard gymClass={item} onPress={() => setSelected(item)} />}
            />
          )}
          {tab === 'search' && <SearchScreen api={api} onSelect={setSelected} refreshKey={refreshKey} />}
          {tab === 'mine' && (
            <MyEnrollments api={api} onOpenClass={setSelected} onChanged={refresh} refreshKey={refreshKey} />
          )}
          {tab === 'account' && (
            <AccountScreen
              api={api}
              session={session}
              onLogin={(newSession) => {
                setSession(newSession);
                setSessionMessage(null);
                setTab('classes');
                refresh();
              }}
              onLogout={() => {
                setSession(null);
                refresh();
              }}
            />
          )}
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.tabBarArea}>
        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={styles.tab}
              >
                <Text style={[styles.tabIcon, !active && { opacity: 0.5 }]}>{t.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <ClassDetail
        api={api}
        gymClass={form.open ? null : selected}
        onClose={() => setSelected(null)}
        onEdit={(gymClass) => setForm({ open: true, gymClass })}
        onChanged={refresh}
      />

      <ClassForm
        api={api}
        visible={form.open}
        gymClass={form.gymClass}
        createHref={createHref}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={(saved) => {
          setForm((f) => ({ ...f, open: false }));
          setSelected(saved); // abre o detalhe da aula salva
          refresh();
        }}
      />

      <SettingsModal
        visible={settingsOpen}
        host={host}
        onClose={() => setSettingsOpen(false)}
        onSave={(newHost) => {
          setHost(newHost);
          setSettingsOpen(false);
        }}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  addButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  addText: { color: colors.accentText, fontSize: 14, fontWeight: '700' },
  serverChip: {
    maxWidth: 150,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverText: { color: colors.muted, fontSize: 13 },
  banner: { margin: 12, marginBottom: 0, padding: 12, borderRadius: 10, backgroundColor: '#2A1416' },
  bannerText: { color: colors.danger, fontSize: 14 },
  content: { flex: 1 },
  tabBarArea: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tabBar: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 56 },
  tabIcon: { fontSize: 22 },
  tabLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  tabLabelActive: { color: colors.accent, fontWeight: '700' },
});
