import { db } from "@/firebase/admin";
import type { Adapter, Where, BetterAuthOptions } from "better-auth";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";

export function firebaseAdapter() {
  return (_options: BetterAuthOptions): Adapter => {
    // Helper to remove undefined values from objects
    const removeUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
      return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
      );
    };

    // Helper function to build Firestore queries from Better Auth Where conditions
    const buildQuery = (
      collection: FirebaseFirestore.CollectionReference<DocumentData>,
      where?: Where[]
    ) => {
      let query = collection as FirebaseFirestore.Query<DocumentData>;

      if (Array.isArray(where) && where.length > 0) {
        where.forEach((condition: Where) => {
          const operator = condition.operator || "eq";
          
          switch (operator) {
            case "eq":
              query = query.where(condition.field, "==", condition.value);
              break;
            case "ne":
              query = query.where(condition.field, "!=", condition.value);
              break;
            case "lt":
              query = query.where(condition.field, "<", condition.value);
              break;
            case "lte":
              query = query.where(condition.field, "<=", condition.value);
              break;
            case "gt":
              query = query.where(condition.field, ">", condition.value);
              break;
            case "gte":
              query = query.where(condition.field, ">=", condition.value);
              break;
            case "in":
              query = query.where(condition.field, "in", condition.value);
              break;
            case "contains":
              query = query.where(condition.field, "array-contains", condition.value);
              break;
            default:
              query = query.where(condition.field, "==", condition.value);
          }
        });
      }

      return query;
    };

    return {
      id: "firebase-adapter",

      async create<T extends Record<string, unknown>, R = T>({ 
        model, 
        data,
        forceAllowId 
      }: {
        model: string;
        data: Omit<T, "id">;
        select?: string[];
        forceAllowId?: boolean;
      }): Promise<R> {
        try {
          const collection = db.collection(model);
          const dataWithTimestamps = removeUndefined({
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          if (forceAllowId && 'id' in data) {
            const docRef = collection.doc(data.id as string);
            await docRef.set(dataWithTimestamps);
            const doc = await docRef.get();
            return { id: docRef.id, ...doc.data() } as R;
          }

          const docRef = await collection.add(dataWithTimestamps);
          const doc = await docRef.get();
          return { id: docRef.id, ...doc.data() } as R;
        } catch (error) {
          console.error(`Error creating ${model}:`, error);
          throw error;
        }
      },

      async findOne<T>({ 
        model, 
        where 
      }: {
        model: string;
        where: Where[];
        select?: string[];
      }): Promise<T | null> {
        try {
          const collection = db.collection(model);
          const query = buildQuery(collection, where);
          const snapshot = await query.limit(1).get();
          
          if (snapshot.empty) return null;
          
          const doc = snapshot.docs[0] as QueryDocumentSnapshot<DocumentData>;
          return { id: doc.id, ...doc.data() } as T;
        } catch (error) {
          console.error(`Error finding ${model}:`, error);
          return null;
        }
      },

      async findMany<T>({ 
        model, 
        where, 
        limit, 
        offset,
        sortBy 
      }: {
        model: string;
        where?: Where[];
        limit?: number;
        sortBy?: { field: string; direction: "asc" | "desc" };
        offset?: number;
      }): Promise<T[]> {
        try {
          const collection = db.collection(model);
          let query = buildQuery(collection, where);

          if (sortBy) {
            query = query.orderBy(sortBy.field, sortBy.direction);
          }

          if (limit) query = query.limit(limit);
          if (offset) query = query.offset(offset);

          const snapshot = await query.get();
          return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as T[];
        } catch (error) {
          console.error(`Error finding many ${model}:`, error);
          return [];
        }
      },

      async update<T>({ 
        model, 
        where, 
        update 
      }: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<T | null> {
        try {
          const collection = db.collection(model);
          const query = buildQuery(collection, where);
          const snapshot = await query.limit(1).get();
          
          if (snapshot.empty) return null;

          const doc = snapshot.docs[0] as QueryDocumentSnapshot<DocumentData>;
          const updateData = removeUndefined({
            ...update,
            updatedAt: new Date().toISOString(),
          });
          
          await doc.ref.update(updateData);

          const updated = await doc.ref.get();
          return { id: updated.id, ...updated.data() } as T;
        } catch (error) {
          console.error(`Error updating ${model}:`, error);
          return null;
        }
      },

      async updateMany({ 
        model, 
        where, 
        update 
      }: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<number> {
        try {
          const collection = db.collection(model);
          const query = buildQuery(collection, where);
          const snapshot = await query.get();
          
          if (snapshot.empty) return 0;

          const docs = snapshot.docs;
          const chunkSize = 500;
          let updatedCount = 0;
          const updateData = removeUndefined({
            ...update,
            updatedAt: new Date().toISOString(),
          });

          for (let i = 0; i < docs.length; i += chunkSize) {
            const chunk = docs.slice(i, i + chunkSize);
            const batch = db.batch();
            
            chunk.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              batch.update(doc.ref, updateData as any);
            });

            await batch.commit();
            updatedCount += chunk.length;
          }
          
          return updatedCount;
        } catch (error) {
          console.error(`Error updating many ${model}:`, error);
          return 0;
        }
      },

      async delete({ 
        model, 
        where 
      }: {
        model: string;
        where: Where[];
      }): Promise<void> {
        try {
          const collection = db.collection(model);
          const query = buildQuery(collection, where);
          const snapshot = await query.get();
          
          if (snapshot.empty) return;

          const batch = db.batch();
          snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
        } catch (error) {
          console.error(`Error deleting ${model}:`, error);
        }
      },

      async deleteMany({ 
        model, 
        where 
      }: {
        model: string;
        where: Where[];
      }): Promise<number> {
        try {
          const collection = db.collection(model);
          const query = buildQuery(collection, where);
          const snapshot = await query.get();
          
          if (snapshot.empty) return 0;

          const docs = snapshot.docs;
          const chunkSize = 500;
          let deletedCount = 0;

          for (let i = 0; i < docs.length; i += chunkSize) {
            const chunk = docs.slice(i, i + chunkSize);
            const batch = db.batch();
            
            chunk.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              batch.delete(doc.ref);
            });

            await batch.commit();
            deletedCount += chunk.length;
          }

          return deletedCount;
        } catch (error) {
          console.error(`Error deleting many ${model}:`, error);
          return 0;
        }
      },

      async count({ 
        model, 
        where 
      }: {
        model: string;
        where?: Where[];
      }): Promise<number> {
        try {
          const collection = db.collection(model);
          const query = buildQuery(collection, where);
          const snapshot = await query.count().get();
          return snapshot.data().count;
        } catch (error) {
          console.error(`Error counting ${model}:`, error);
          return 0;
        }
      },

      transaction: async (callback) => {
        return await db.runTransaction(async (transaction) => {
          const txAdapter: Adapter = {
            id: "firebase-adapter-transaction",

            async create<T extends Record<string, unknown>, R = T>({ 
              model, 
              data,
              forceAllowId 
            }: {
              model: string;
              data: Omit<T, "id">;
              select?: string[];
              forceAllowId?: boolean;
            }): Promise<R> {
              const collection = db.collection(model);
              const dataWithTimestamps = removeUndefined({
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });

              if (forceAllowId && 'id' in data) {
                const docRef = collection.doc(data.id as string);
                transaction.set(docRef, dataWithTimestamps);
                return { id: docRef.id, ...dataWithTimestamps } as R;
              }

              const docRef = collection.doc();
              transaction.set(docRef, dataWithTimestamps);
              return { id: docRef.id, ...dataWithTimestamps } as R;
            },

            async findOne<T>({ 
              model, 
              where 
            }: {
              model: string;
              where: Where[];
              select?: string[];
            }): Promise<T | null> {
              const collection = db.collection(model);
              const query = buildQuery(collection, where);
              const snapshot = await transaction.get(query.limit(1));
              
              if (snapshot.empty) return null;
              
              const doc = snapshot.docs[0] as QueryDocumentSnapshot<DocumentData>;
              return { id: doc.id, ...doc.data() } as T;
            },

            async findMany<T>({ 
              model, 
              where, 
              limit, 
              offset,
              sortBy 
            }: {
              model: string;
              where?: Where[];
              limit?: number;
              sortBy?: { field: string; direction: "asc" | "desc" };
              offset?: number;
            }): Promise<T[]> {
              const collection = db.collection(model);
              let query = buildQuery(collection, where);

              if (sortBy) {
                query = query.orderBy(sortBy.field, sortBy.direction);
              }

              if (limit) query = query.limit(limit);
              if (offset) query = query.offset(offset);

              const snapshot = await transaction.get(query);
              return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ 
                id: doc.id, 
                ...doc.data() 
              })) as T[];
            },

            async update<T>({ 
              model, 
              where, 
              update 
            }: {
              model: string;
              where: Where[];
              update: Record<string, unknown>;
            }): Promise<T | null> {
              const collection = db.collection(model);
              const query = buildQuery(collection, where);
              const snapshot = await transaction.get(query.limit(1));
              
              if (snapshot.empty) return null;

              const doc = snapshot.docs[0] as QueryDocumentSnapshot<DocumentData>;
              const updateData = removeUndefined({
                ...update,
                updatedAt: new Date().toISOString(),
              });
              
              transaction.update(doc.ref, updateData as any);
              
              return { 
                id: doc.id, 
                ...doc.data(),
                ...updateData 
              } as T;
            },

            async updateMany({ 
              model, 
              where, 
              update 
            }: {
              model: string;
              where: Where[];
              update: Record<string, unknown>;
            }): Promise<number> {
              const collection = db.collection(model);
              const query = buildQuery(collection, where);
              const snapshot = await transaction.get(query);
              
              if (snapshot.empty) return 0;

              const updateData = removeUndefined({
                ...update,
                updatedAt: new Date().toISOString(),
              });

              snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                transaction.update(doc.ref, updateData as any);
              });
              
              return snapshot.docs.length;
            },

            async delete({ 
              model, 
              where 
            }: {
              model: string;
              where: Where[];
            }): Promise<void> {
              const collection = db.collection(model);
              const query = buildQuery(collection, where);
              const snapshot = await transaction.get(query);
              
              if (snapshot.empty) return;

              snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                transaction.delete(doc.ref);
              });
            },

            async deleteMany({ 
              model, 
              where 
            }: {
              model: string;
              where: Where[];
            }): Promise<number> {
              const collection = db.collection(model);
              const query = buildQuery(collection, where);
              const snapshot = await transaction.get(query);
              
              if (snapshot.empty) return 0;

              snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                transaction.delete(doc.ref);
              });
              
              return snapshot.docs.length;
            },

            async count({ 
              model, 
              where 
            }: {
              model: string;
              where?: Where[];
            }): Promise<number> {
              const collection = db.collection(model);
              const query = buildQuery(collection, where);
              const snapshot = await transaction.get(query);
              return snapshot.size;
            },

            transaction: async () => {
              throw new Error("Nested transactions are not supported in Firestore");
            },
          };

          return await callback(txAdapter);
        });
      },
    };
  };
}
