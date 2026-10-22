import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { readPage } from '../api';
import { colors } from '../theme';
import { ErrorBox } from './ui';

/**
 * Lista paginada que segue o link "next" do HATEOAS:
 * carrega a primeira página por `url` e, ao rolar até o fim, busca _links.next.href.
 * `embeddedKey` é a chave dentro de _embedded (classes ou enrollments).
 * `onPageLinks` recebe os _links da página (ex.: o link create, que só vem para o ADMIN).
 */
export default function PagedList({
  api,
  url,
  embeddedKey,
  renderItem,
  header,
  emptyText,
  noun = ['item', 'itens'],
  refreshKey,
  onPageLinks,
}) {
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    setError(null);
    try {
      const page = readPage(await api.get(url), embeddedKey);
      if (id !== requestId.current) return;
      setItems(page.items);
      setNext(page.next);
      setTotal(page.total);
      onPageLinks?.(page.links);
    } catch (e) {
      if (id !== requestId.current) return;
      setItems([]);
      setNext(null);
      setTotal(null);
      setError(e.message);
      onPageLinks?.({});
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [api, url, embeddedKey]);

  useEffect(() => {
    setLoading(true);
    loadFirst();
  }, [loadFirst, refreshKey]);

  async function loadMore() {
    if (!next || loadingMore || loading) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = readPage(await api.get(next), embeddedKey);
      if (id !== requestId.current) return;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setNext(page.next);
      setTotal(page.total);
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} size="large" />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.accent}
          onRefresh={() => {
            setRefreshing(true);
            loadFirst();
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {error ? (
            <ErrorBox message={error} onRetry={loadFirst} />
          ) : (
            total !== null && (
              <Text style={styles.count}>
                {items.length} de {total} {total === 1 ? noun[0] : noun[1]}
              </Text>
            )
          )}
        </View>
      }
      ListEmptyComponent={!error && <Text style={styles.empty}>{emptyText ?? 'Nada encontrado.'}</Text>}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color={colors.accent} />
        ) : items.length > 0 && !next && !error ? (
          <Text style={styles.end}>Fim da lista</Text>
        ) : null
      }
      renderItem={({ item }) => renderItem(item, loadFirst)}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  header: { gap: 12 },
  count: { color: colors.muted, fontSize: 14 },
  empty: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 40 },
  end: { color: colors.muted, fontSize: 13, textAlign: 'center', marginVertical: 12 },
});
