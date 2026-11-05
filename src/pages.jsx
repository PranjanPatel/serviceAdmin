import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// loads a list from the API, with search and paging
function useList(path, withSearch = true) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const qs = `?page=${page}${withSearch && q ? `&q=${encodeURIComponent(q)}` : ""}`;
      setRows(await api(path + qs));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path, page, q, withSearch]);

  useEffect(() => {
    load();
  }, [load]);
  return { rows, q, setQ, page, setPage, loading, error, reload: load };
}

function Toolbar({ list, placeholder }) {
  return (
    <div className="toolbar">
      {placeholder && (
        <input
          placeholder={placeholder}
          value={list.q}
          onChange={(e) => {
            list.setPage(1);
            list.setQ(e.target.value);
          }}
        />
      )}
      <div className="pager">
        <button
          disabled={list.page <= 1}
          onClick={() => list.setPage(list.page - 1)}
        >
          Prev
        </button>
        <span>Page {list.page}</span>
        <button
          disabled={list.rows.length < 20}
          onClick={() => list.setPage(list.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function State({ list }) {
  if (list.loading) return <p className="muted">Loading...</p>;
  if (list.error) return <p className="err">{list.error}</p>;
  if (list.rows.length === 0) return <p className="muted">Nothing found.</p>;
  return null;
}

const date = (d) => new Date(d).toLocaleDateString();

export function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/admin/stats")
      .then(setS)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="err">{error}</p>;
  if (!s) return <p className="muted">Loading...</p>;

  const cards = [
    ["Customers", s.users],
    ["Vendors", s.vendors],
    ["Paid vendors", s.paidVendors],
    ["Suspended", s.suspended],
    ["Reviews", s.reviews],
    ["Revenue this month", `₹${s.revenueThisMonth}`],
  ];
  return (
    <div className="cards">
      {cards.map(([label, value]) => (
        <div className="card" key={label}>
          <div className="num">{value}</div>
          <div className="muted">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function Vendors() {
  const list = useList("/admin/vendors");

  const act = async (fn) => {
    try {
      await fn();
      list.reload();
    } catch (e) {
      alert(e.message);
    }
  };
  const suspend = (v) => {
    const next = !v.suspended;
    if (confirm(`${next ? "Suspend" : "Unsuspend"} ${v.businessName}?`)) {
      act(() =>
        api(`/admin/vendors/${v._id}/suspend`, {
          method: "PATCH",
          body: JSON.stringify({ suspended: next }),
        }),
      );
    }
  };
  const setPlan = (v, type) => {
    if (!type) return;
    const days =
      type === "free"
        ? 0
        : Number(prompt("Number of days for this plan?", "30"));
    if (type !== "free" && !days) return;
    act(() =>
      api(`/admin/vendors/${v._id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ type, days }),
      }),
    );
  };

  return (
    <>
      <Toolbar list={list} placeholder="Search business name..." />
      <State list={list} />
      {list.rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Owner</th>
              <th>Category</th>
              <th>Plan</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((v) => (
              <tr key={v._id}>
                <td>{v.businessName}</td>
                <td>
                  {v.owner?.name}
                  <div className="muted">{v.owner?.email}</div>
                </td>
                <td>{v.category}</td>
                <td>
                  {v.plan?.type || "free"} ({v.plan?.status || "active"})
                  {v.plan?.expiresAt && (
                    <div className="muted">until {date(v.plan.expiresAt)}</div>
                  )}
                </td>
                <td>
                  {v.reviewCount ? `${v.avgRating} (${v.reviewCount})` : "-"}
                </td>
                <td>
                  <span className={`tag ${v.suspended ? "red" : "green"}`}>
                    {v.suspended ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="actions">
                  <button onClick={() => suspend(v)}>
                    {v.suspended ? "Unsuspend" : "Suspend"}
                  </button>
                  <select
                    value={v.plan?.type || "free"}
                    onChange={(e) => setPlan(v, e.target.value)}
                  >
                    <option value="">Set plan...</option>
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="featured">Featured</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function Users() {
  const list = useList("/admin/users");
  const toggle = async (u) => {
    const next = !u.blocked;
    if (!confirm(`${next ? "Block" : "Unblock"} ${u.name}?`)) return;
    try {
      await api(`/admin/users/${u._id}/block`, {
        method: "PATCH",
        body: JSON.stringify({ blocked: next }),
      });
      list.reload();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <Toolbar list={list} placeholder="Search name, email or phone..." />
      <State list={list} />
      {list.rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td>{u.role}</td>
                <td>{date(u.createdAt)}</td>
                <td>
                  <span className={`tag ${u.blocked ? "red" : "green"}`}>
                    {u.blocked ? "Blocked" : "Active"}
                  </span>
                </td>
                <td>
                  {u.role !== "admin" && (
                    <button onClick={() => toggle(u)}>
                      {u.blocked ? "Unblock" : "Block"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function Reviews() {
  const list = useList("/admin/reviews", false);
  const remove = async (r) => {
    if (!confirm("Delete this review? The vendor rating will be recalculated."))
      return;
    try {
      await api(`/admin/reviews/${r._id}`, { method: "DELETE" });
      list.reload();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <Toolbar list={list} />
      <State list={list} />
      {list.rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>User</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((r) => (
              <tr key={r._id}>
                <td>{r.vendor?.businessName || "-"}</td>
                <td>{r.user?.name || "-"}</td>
                <td>{"★".repeat(r.rating)}</td>
                <td>{r.comment}</td>
                <td>{date(r.createdAt)}</td>
                <td>
                  <button className="danger" onClick={() => remove(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function Payments() {
  const list = useList("/admin/payments", false);
  return (
    <>
      <Toolbar list={list} />
      <State list={list} />
      {list.rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment ID</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((p) => (
              <tr key={p._id}>
                <td>{date(p.createdAt)}</td>
                <td>{p.vendor?.businessName || "-"}</td>
                <td>{p.plan}</td>
                <td>₹{p.amount / 100}</td>
                <td>
                  <span
                    className={`tag ${p.status === "paid" ? "green" : "grey"}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="muted">{p.paymentId || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
