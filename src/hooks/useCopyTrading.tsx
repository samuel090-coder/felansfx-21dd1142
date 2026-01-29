import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface CopyLeader {
  id: string;
  user_id: string;
  display_id: string | null;
  avatar_url: string | null;
  full_name: string | null;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_pnl: number;
  updated_at: string;
}

interface CopyFollow {
  id: string;
  follower_id: string;
  leader_id: string;
  fixed_amount: number;
  is_active: boolean;
  created_at: string;
}

export const useCopyTrading = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leaders, setLeaders] = useState<CopyLeader[]>([]);
  const [follows, setFollows] = useState<CopyFollow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaders = useCallback(async () => {
    const { data, error } = await supabase
      .from("copy_leaders")
      .select("*")
      .order("win_rate", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLeaders(data);
    }
  }, []);

  const fetchFollows = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("copy_follows")
      .select("*")
      .eq("follower_id", user.id);

    if (!error && data) {
      setFollows(data);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchLeaders();
      await fetchFollows();
      setLoading(false);
    };
    init();
  }, [fetchLeaders, fetchFollows]);

  const followLeader = async (leaderId: string, fixedAmount: number) => {
    if (!user) {
      toast({ title: "Error", description: "Please log in", variant: "destructive" });
      return false;
    }

    if (leaderId === user.id) {
      toast({ title: "Error", description: "You cannot follow yourself", variant: "destructive" });
      return false;
    }

    const { error } = await supabase.from("copy_follows").upsert(
      {
        follower_id: user.id,
        leader_id: leaderId,
        fixed_amount: fixedAmount,
        is_active: true,
      },
      { onConflict: "follower_id,leader_id" }
    );

    if (error) {
      console.error("Follow error:", error);
      toast({ title: "Error", description: "Failed to follow trader", variant: "destructive" });
      return false;
    }

    toast({ title: "Success", description: "You are now copying this trader!" });
    await fetchFollows();
    return true;
  };

  const unfollowLeader = async (leaderId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("copy_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("leader_id", leaderId);

    if (error) {
      console.error("Unfollow error:", error);
      toast({ title: "Error", description: "Failed to unfollow trader", variant: "destructive" });
      return false;
    }

    toast({ title: "Unfollowed", description: "You stopped copying this trader" });
    await fetchFollows();
    return true;
  };

  const isFollowing = (leaderId: string) => {
    return follows.some((f) => f.leader_id === leaderId && f.is_active);
  };

  const getFollowAmount = (leaderId: string) => {
    const follow = follows.find((f) => f.leader_id === leaderId);
    return follow?.fixed_amount ?? 0;
  };

  return {
    leaders,
    follows,
    loading,
    followLeader,
    unfollowLeader,
    isFollowing,
    getFollowAmount,
    refetch: async () => {
      await fetchLeaders();
      await fetchFollows();
    },
  };
};
