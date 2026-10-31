import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addInventoryLot, consumeLot, discardLot } from '@/features/food/api';
import { STATIC_INVENTORY } from '@/features/food/static-inventory';

export const foodKeys = {
  all: ['food'] as const,
  inventory: ['food', 'inventory'] as const,
};

// Reads are static for now. When the backend is ready, use `listInventory` from api.ts.
export function useInventory() {
  return useQuery({ queryKey: foodKeys.inventory, queryFn: () => Promise.resolve(STATIC_INVENTORY) });
}

// Writes invalidate the whole food tree: an inventory change also moves expiring lists and the shopping list.
function useFoodMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodKeys.all }),
  });
}

export const useAddInventoryLot = () => useFoodMutation(addInventoryLot);
export const useConsumeLot = () => useFoodMutation(consumeLot);
export const useDiscardLot = () => useFoodMutation(discardLot);
