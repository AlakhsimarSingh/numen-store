import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
}

interface ReviewsState {
  reviews: Review[];
  votedHelpful: string[];
  addReview: (review: Omit<Review, "id" | "createdAt" | "helpfulCount">) => void;
  removeReview: (id: string) => void;
  markHelpful: (id: string) => void;
  getByProduct: (productId: string) => Review[];
}

export const useReviewsStore = create<ReviewsState>()(
  persist(
    (set, get) => ({
      reviews: [],
      votedHelpful: [],

      addReview: (review) =>
        set((state) => ({
          reviews: [
            {
              ...review,
              id: `rev-${Date.now()}`,
              createdAt: new Date().toISOString(),
              helpfulCount: 0,
            },
            ...state.reviews,
          ],
        })),

      removeReview: (id) => set((state) => ({ reviews: state.reviews.filter((r) => r.id !== id) })),

      markHelpful: (id) =>
        set((state) => {
          if (state.votedHelpful.includes(id)) return state;
          return {
            votedHelpful: [...state.votedHelpful, id],
            reviews: state.reviews.map((r) =>
              r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
            ),
          };
        }),

      getByProduct: (productId) =>
        get().reviews.filter((r) => r.productId === productId),
    }),
    { name: "numen-reviews" }
  )
);