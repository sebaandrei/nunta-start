import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { type CollectionField, fieldKeyFor, ofCollection, type RecordData } from '../domain/collections';
import { keys } from '../lib/queryKeys';
import {
  deleteCollection,
  deleteCollectionField,
  deleteCollectionRecord,
  insertCollection,
  insertCollectionField,
  insertCollectionRecord,
  renameCollection,
  updateCollectionField,
  updateCollectionRecord,
} from './collections';
import { useListMutation } from './guestActions';
import {
  type CollectionFieldPatch,
  collectionFieldPatchToUpdate,
  nextPosition,
  positionBetween,
  type ServerCollection,
  type ServerCollectionField,
  type ServerCollectionRecord,
} from './mappers';

export type NewField = Pick<CollectionField, 'label' | 'type' | 'required' | 'options'>;

export interface CollectionActions {
  /** Pagina nouă; întoarce rândul de la server, cu slug-ul generat acolo. */
  addCollection(name: string): Promise<ServerCollection>;
  renameCollection(id: string, name: string): void;
  /** Șterge pagina, câmpurile și înregistrările ei. */
  removeCollection(id: string): void;
  addField(collectionId: string, field: NewField): void;
  updateField(id: string, patch: CollectionFieldPatch): void;
  /** Mută câmpul cu o poziție în sus (-1) sau în jos (1). */
  moveField(id: string, direction: -1 | 1): void;
  removeField(id: string): void;
  addRecord(collectionId: string, data: RecordData): void;
  updateRecord(id: string, data: RecordData): void;
  removeRecord(id: string): void;
}

const SCOPE = 'collections';

/** Paginile proprii, câmpurile și înregistrările lor: scrieri optimiste, în ordinea strictă a scrierilor pe nuntă. */
export function useCollectionActions(weddingId: string): CollectionActions {
  const queryClient = useQueryClient();
  const collectionsKey = keys.wedding(weddingId).collections();
  const fieldsKey = keys.wedding(weddingId).collectionFields();
  const recordsKey = keys.wedding(weddingId).collectionRecords();

  // Slug-ul vine de la server, deci pagina nouă nu e optimistă: intră în cache după răspuns.
  const addC = useMutation({
    mutationKey: [...collectionsKey, 'write'],
    scope: { id: `${SCOPE}:${weddingId}` },
    mutationFn: (name: string) =>
      insertCollection(
        weddingId,
        name,
        nextPosition(queryClient.getQueryData<ServerCollection[]>(collectionsKey) ?? []),
      ),
    onSuccess: (collection) =>
      queryClient.setQueryData<ServerCollection[]>(collectionsKey, (list) =>
        list && !list.some((c) => c.id === collection.id) ? [...list, collection] : list,
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: collectionsKey }),
  });
  const renameC = useListMutation<ServerCollection, { id: string; name: string }>(
    weddingId,
    collectionsKey,
    ({ id, name }) => renameCollection(id, name),
    (list, { id, name }) => list.map((c) => (c.id === id ? { ...c, name } : c)),
    SCOPE,
  );
  const removeC = useListMutation<ServerCollection, string>(
    weddingId,
    collectionsKey,
    deleteCollection,
    (list, id) => list.filter((c) => c.id !== id),
    SCOPE,
  );
  const addF = useListMutation<ServerCollectionField, ServerCollectionField>(
    weddingId,
    fieldsKey,
    (f) => insertCollectionField(weddingId, f),
    (list, f) => [...list, f],
    SCOPE,
  );
  const updateF = useListMutation<ServerCollectionField, { id: string; patch: CollectionFieldPatch }>(
    weddingId,
    fieldsKey,
    ({ id, patch }) => updateCollectionField(id, collectionFieldPatchToUpdate(patch)),
    (list, { id, patch }) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    SCOPE,
  );
  const removeF = useListMutation<ServerCollectionField, { id: string; strip: ServerCollectionRecord[] }>(
    weddingId,
    fieldsKey,
    ({ id, strip }) => deleteCollectionField(id, strip),
    (list, { id }) => list.filter((f) => f.id !== id),
    SCOPE,
  );
  const addR = useListMutation<ServerCollectionRecord, ServerCollectionRecord>(
    weddingId,
    recordsKey,
    (r) => insertCollectionRecord(weddingId, r),
    (list, r) => [...list, r],
    SCOPE,
  );
  const updateR = useListMutation<ServerCollectionRecord, { id: string; data: RecordData }>(
    weddingId,
    recordsKey,
    ({ id, data }) => updateCollectionRecord(id, data),
    (list, { id, data }) => list.map((r) => (r.id === id ? { ...r, data } : r)),
    SCOPE,
  );
  const removeR = useListMutation<ServerCollectionRecord, string>(
    weddingId,
    recordsKey,
    deleteCollectionRecord,
    (list, id) => list.filter((r) => r.id !== id),
    SCOPE,
  );

  const { mutateAsync: addCollection } = addC;
  const { mutate: renameCollectionM } = renameC;
  const { mutate: removeCollectionM } = removeC;
  const { mutate: addField } = addF;
  const { mutate: updateFieldM } = updateF;
  const { mutate: removeFieldM } = removeF;
  const { mutate: addRecord } = addR;
  const { mutate: updateRecordM } = updateR;
  const { mutate: removeRecordM } = removeR;

  return useMemo<CollectionActions>(() => {
    const k = keys.wedding(weddingId);
    const [collectionsKey, fieldsKey, recordsKey] = [k.collections(), k.collectionFields(), k.collectionRecords()];
    const cachedCollections = () => queryClient.getQueryData<ServerCollection[]>(collectionsKey) ?? [];
    const cachedFields = () => queryClient.getQueryData<ServerCollectionField[]>(fieldsKey) ?? [];
    const cachedRecords = () => queryClient.getQueryData<ServerCollectionRecord[]>(recordsKey) ?? [];
    return {
      addCollection,
      renameCollection: (id, name) => {
        if (cachedCollections().find((c) => c.id === id)?.name !== name) renameCollectionM({ id, name });
      },
      removeCollection: (id) => {
        // Cascada din DB șterge câmpurile și înregistrările paginii; listele lor din cache o urmează imediat.
        queryClient.setQueryData<ServerCollectionField[]>(
          fieldsKey,
          cachedFields().filter((f) => f.collectionId !== id),
        );
        queryClient.setQueryData<ServerCollectionRecord[]>(
          recordsKey,
          cachedRecords().filter((r) => r.collectionId !== id),
        );
        removeCollectionM(id);
      },
      addField: (collectionId, field) => {
        const siblings = ofCollection(cachedFields(), collectionId);
        addField({
          ...field,
          id: crypto.randomUUID(),
          collectionId,
          key: fieldKeyFor(
            field.label,
            siblings.map((f) => f.key),
          ),
          options: field.type === 'choice' ? field.options : [],
          position: nextPosition(siblings),
        });
      },
      updateField: (id, patch) => updateFieldM({ id, patch }),
      moveField: (id, direction) => {
        const field = cachedFields().find((f) => f.id === id);
        if (!field) return;
        const siblings = ofCollection(cachedFields(), field.collectionId);
        const at = siblings.findIndex((f) => f.id === id);
        const target = at + direction;
        if (target < 0 || target >= siblings.length) return;
        // Între vecinul peste care trece și cel de după el (null = capătul listei).
        const [near, far] = [siblings[target]?.position ?? null, siblings[target + direction]?.position ?? null];
        updateFieldM({
          id,
          patch: { position: direction < 0 ? positionBetween(far, near) : positionBetween(near, far) },
        });
      },
      removeField: (id) => {
        const field = cachedFields().find((f) => f.id === id);
        if (!field) return;
        const stripKey = ({ [field.key]: _gone, ...rest }: Record<string, unknown>) => rest;
        const strip = cachedRecords()
          .filter((r) => r.collectionId === field.collectionId && field.key in r.data)
          .map((r) => ({ ...r, data: stripKey(r.data) }));
        const stripped = new Map(strip.map((r) => [r.id, r]));
        queryClient.setQueryData<ServerCollectionRecord[]>(
          recordsKey,
          cachedRecords().map((r) => stripped.get(r.id) ?? r),
        );
        removeFieldM({ id, strip }, { onSettled: () => void queryClient.invalidateQueries({ queryKey: recordsKey }) });
      },
      addRecord: (collectionId, data) =>
        addRecord({
          id: crypto.randomUUID(),
          collectionId,
          data,
          position: nextPosition(ofCollection(cachedRecords(), collectionId)),
        }),
      updateRecord: (id, data) => {
        const current = cachedRecords().find((r) => r.id === id);
        if (current && JSON.stringify(current.data) !== JSON.stringify(data)) updateRecordM({ id, data });
      },
      removeRecord: (id) => removeRecordM(id),
    };
  }, [
    queryClient,
    weddingId,
    addCollection,
    renameCollectionM,
    removeCollectionM,
    addField,
    updateFieldM,
    removeFieldM,
    addRecord,
    updateRecordM,
    removeRecordM,
  ]);
}
