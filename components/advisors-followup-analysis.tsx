import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

type Advisor = {
  id: string;
  fullName: string;
  email: string;
  user_id: string;
};

export default function AdvisorsFollowUpAnalysis() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdvisors() {
      const { data, error } = await supabase
        .from("users")
        .select("id, fullname, email, user_id")
        .eq("role", "advisor");
      if (error) {
        console.error('Error fetching advisors:', error);
        setAdvisors([]);
      } else {
        // Map fullname (lowercase DB column) to fullName (camelCase component prop)
        const mappedAdvisors = (data || []).map(advisor => ({
          id: String(advisor.id),
          fullName: (advisor.fullname as string) || '',
          email: (advisor.email as string) || '',
          user_id: (advisor.user_id as string) || ''
        }));
        setAdvisors(mappedAdvisors);
      }
      setLoading(false);
    }
    fetchAdvisors();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Advisors Follow-up Analysis</h2>
      {loading ? (
        <div>Loading advisors...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {advisors.map((advisor) => (
              <Link href={`/advisors/${advisor.id}`} key={advisor.id}>
                <div className="border rounded p-4 hover:bg-blue-50 cursor-pointer">
                  <div className="font-semibold">{advisor.fullName}</div>
                  <div className="text-sm text-gray-600">{advisor.email}</div>
                  <div className="text-xs text-blue-600 mt-2">View follow-up details</div>
                </div>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
