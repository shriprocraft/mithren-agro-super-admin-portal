// DEMO DATA. Every person and business below is fictional; emails use the reserved example.com
// domain and phone numbers use an obviously fake 90000 range.
import type { Customer, Seller, StaffMember } from "@/lib/types";

export const staffFixture: StaffMember[] = [
  { id: "stf-001", name: "Demo Super Admin", email: "superadmin@mithrenagro.example", role: "super_admin", status: "active", lastActiveAt: "2026-10-28T04:30:00.000Z" },
  { id: "stf-002", name: "Kavya Raman", email: "kavya.ops@example.com", role: "admin", status: "active", lastActiveAt: "2026-10-27T11:12:00.000Z" },
  { id: "stf-003", name: "Arjun Mehta", email: "arjun.support@example.com", role: "admin", status: "active", lastActiveAt: "2026-10-27T09:40:00.000Z" },
  { id: "stf-004", name: "Nisha Varghese", email: "nisha.catalogue@example.com", role: "admin", status: "active", lastActiveAt: "2026-10-26T15:05:00.000Z" },
  { id: "stf-005", name: "Rohan Desai", email: "rohan.finance@example.com", role: "admin", status: "inactive", lastActiveAt: "2026-09-30T08:00:00.000Z" },
];

const c = (
  id: string,
  name: string,
  handle: string,
  phoneTail: string,
  city: string,
  joinedAt: string,
  restriction?: Customer["restriction"],
): Customer => ({
  id,
  name,
  email: `${handle}@example.com`,
  phone: `+91 90000 ${phoneTail}`,
  city,
  joinedAt,
  status: restriction ? "restricted" : "active",
  restriction,
});

export const customersFixture: Customer[] = [
  c("cus-001", "Ananya Iyer", "ananya.iyer", "10001", "Chennai", "2026-03-04T05:20:00.000Z"),
  c("cus-002", "Rahul Nair", "rahul.nair", "10002", "Bengaluru", "2026-03-18T07:10:00.000Z"),
  c("cus-003", "Priya Sharma", "priya.sharma", "10003", "Bengaluru", "2026-04-02T10:00:00.000Z"),
  c("cus-004", "Vikram Reddy", "vikram.reddy", "10004", "Hyderabad", "2026-04-21T12:45:00.000Z"),
  c("cus-005", "Meera Krishnan", "meera.k", "10005", "Chennai", "2026-05-09T06:30:00.000Z"),
  c("cus-006", "Sanjay Gupta", "sanjay.g", "10006", "Pune", "2026-05-27T08:15:00.000Z", {
    reason: "Repeated payment chargebacks under review (demo record)",
    at: "2026-10-12T09:00:00.000Z",
    by: "Kavya Raman",
  }),
  c("cus-007", "Divya Menon", "divya.menon", "10007", "Kochi", "2026-06-11T04:50:00.000Z"),
  c("cus-008", "Aditya Rao", "aditya.rao", "10008", "Mysuru", "2026-06-30T13:20:00.000Z"),
  c("cus-009", "Lakshmi Pillai", "lakshmi.p", "10009", "Coimbatore", "2026-07-14T09:35:00.000Z"),
  c("cus-010", "Karan Malhotra", "karan.m", "10010", "Pune", "2026-07-29T11:00:00.000Z"),
  c("cus-011", "Fatima Shaikh", "fatima.s", "10011", "Hyderabad", "2026-08-16T05:05:00.000Z"),
  c("cus-012", "Rohit Joshi", "rohit.joshi", "10012", "Bengaluru", "2026-09-03T07:40:00.000Z", {
    reason: "Abusive messages to delivery staff reported (demo record)",
    at: "2026-10-20T06:30:00.000Z",
    by: "Arjun Mehta",
  }),
  c("cus-013", "Sneha Kulkarni", "sneha.k", "10013", "Chennai", "2026-09-22T10:25:00.000Z"),
  c("cus-014", "Imran Khan", "imran.khan", "10014", "Bengaluru", "2026-10-05T12:10:00.000Z"),
];

const doc = (id: string, type: string, fileName: string, uploadedAt: string, reviewStatus: Seller["documents"][number]["reviewStatus"] = "not_reviewed") => ({
  id,
  type,
  fileName,
  uploadedAt,
  reviewStatus,
});

export const sellersFixture: Seller[] = [
  {
    id: "sel-001", businessName: "Green Valley Farms", contactName: "Suresh Patil", email: "greenvalley@example.com", phone: "+91 90000 20001",
    city: "Nashik", state: "Maharashtra", appliedAt: "2026-02-10T06:00:00.000Z", status: "active", rating: 4.6, ratingCount: 128,
    categoryIds: ["cat-fruits", "cat-vegetables"],
    documents: [
      doc("doc-001-1", "Business registration", "green-valley-registration.pdf", "2026-02-10T06:00:00.000Z", "reviewed_mock"),
      doc("doc-001-2", "Bank account proof", "green-valley-bank.pdf", "2026-02-10T06:02:00.000Z", "reviewed_mock"),
    ],
    statusHistory: [
      { at: "2026-02-10T06:00:00.000Z", status: "pending", by: "Applicant" },
      { at: "2026-02-14T09:30:00.000Z", status: "active", by: "Demo Super Admin", note: "Approved (demo history)" },
    ],
  },
  {
    id: "sel-002", businessName: "Sunrise Organic Collective", contactName: "Revathi Subramanian", email: "sunrise.collective@example.com", phone: "+91 90000 20002",
    city: "Coimbatore", state: "Tamil Nadu", appliedAt: "2026-03-01T05:00:00.000Z", status: "active", rating: 4.4, ratingCount: 86,
    categoryIds: ["cat-vegetables", "cat-leafy-greens"],
    documents: [
      doc("doc-002-1", "Business registration", "sunrise-registration.pdf", "2026-03-01T05:00:00.000Z", "reviewed_mock"),
      doc("doc-002-2", "Bank account proof", "sunrise-bank.pdf", "2026-03-01T05:03:00.000Z", "reviewed_mock"),
      doc("doc-002-3", "Organic certification", "sunrise-organic-cert.pdf", "2026-03-01T05:05:00.000Z", "reviewed_mock"),
    ],
    statusHistory: [
      { at: "2026-03-01T05:00:00.000Z", status: "pending", by: "Applicant" },
      { at: "2026-03-05T10:00:00.000Z", status: "active", by: "Kavya Raman", note: "Approved (demo history)" },
    ],
  },
  {
    id: "sel-003", businessName: "Kaveri Fresh Growers", contactName: "Manjunath Gowda", email: "kaveri.fresh@example.com", phone: "+91 90000 20003",
    city: "Mysuru", state: "Karnataka", appliedAt: "2026-03-22T07:30:00.000Z", status: "active", rating: 4.7, ratingCount: 154,
    categoryIds: ["cat-fruits", "cat-exotic"],
    documents: [
      doc("doc-003-1", "Business registration", "kaveri-registration.pdf", "2026-03-22T07:30:00.000Z", "reviewed_mock"),
      doc("doc-003-2", "Bank account proof", "kaveri-bank.pdf", "2026-03-22T07:31:00.000Z", "reviewed_mock"),
    ],
    statusHistory: [
      { at: "2026-03-22T07:30:00.000Z", status: "pending", by: "Applicant" },
      { at: "2026-03-26T08:20:00.000Z", status: "active", by: "Demo Super Admin", note: "Approved (demo history)" },
    ],
  },
  {
    id: "sel-004", businessName: "Hilltop Harvest Co.", contactName: "Joseph Mathew", email: "hilltop.harvest@example.com", phone: "+91 90000 20004",
    city: "Ooty", state: "Tamil Nadu", appliedAt: "2026-04-15T06:45:00.000Z", status: "suspended", rating: 3.9, ratingCount: 41,
    categoryIds: ["cat-vegetables"],
    suspensionReason: "Repeated late dispatch on vendor sub-orders (demo record)",
    documents: [
      doc("doc-004-1", "Business registration", "hilltop-registration.pdf", "2026-04-15T06:45:00.000Z", "reviewed_mock"),
      doc("doc-004-2", "Bank account proof", "hilltop-bank.pdf", "2026-04-15T06:46:00.000Z", "reviewed_mock"),
    ],
    statusHistory: [
      { at: "2026-04-15T06:45:00.000Z", status: "pending", by: "Applicant" },
      { at: "2026-04-18T11:00:00.000Z", status: "active", by: "Kavya Raman", note: "Approved (demo history)" },
      { at: "2026-10-18T10:15:00.000Z", status: "suspended", by: "Demo Super Admin", note: "Repeated late dispatch on vendor sub-orders (demo record)" },
    ],
  },
  {
    id: "sel-005", businessName: "Riverbend Organics", contactName: "Harpreet Kaur", email: "riverbend@example.com", phone: "+91 90000 20005",
    city: "Ludhiana", state: "Punjab", appliedAt: "2026-10-21T06:10:00.000Z", status: "pending", rating: null, ratingCount: 0,
    categoryIds: ["cat-vegetables", "cat-leafy-greens"],
    documents: [
      doc("doc-005-1", "Business registration", "riverbend-registration.pdf", "2026-10-21T06:10:00.000Z"),
      doc("doc-005-2", "Bank account proof", "riverbend-bank.pdf", "2026-10-21T06:12:00.000Z"),
      doc("doc-005-3", "Organic certification", "riverbend-organic-cert.pdf", "2026-10-21T06:14:00.000Z"),
    ],
    statusHistory: [{ at: "2026-10-21T06:10:00.000Z", status: "pending", by: "Applicant" }],
  },
  {
    id: "sel-006", businessName: "Meadow Root Farms", contactName: "Deepak Yadav", email: "meadowroot@example.com", phone: "+91 90000 20006",
    city: "Indore", state: "Madhya Pradesh", appliedAt: "2026-10-24T09:00:00.000Z", status: "pending", rating: null, ratingCount: 0,
    categoryIds: ["cat-fruits"],
    documents: [
      doc("doc-006-1", "Business registration", "meadowroot-registration.pdf", "2026-10-24T09:00:00.000Z", "reviewed_mock"),
      doc("doc-006-2", "Bank account proof", "meadowroot-bank.pdf", "2026-10-24T09:01:00.000Z", "issue_noted_mock"),
    ],
    statusHistory: [{ at: "2026-10-24T09:00:00.000Z", status: "pending", by: "Applicant" }],
  },
  {
    id: "sel-007", businessName: "Bluebell Agro Partners", contactName: "Tanvi Bose", email: "bluebell.agro@example.com", phone: "+91 90000 20007",
    city: "Kolkata", state: "West Bengal", appliedAt: "2026-09-02T04:40:00.000Z", status: "rejected", rating: null, ratingCount: 0,
    categoryIds: ["cat-vegetables"],
    rejectionReason: "Business registration document was illegible; applicant may re-apply (demo record)",
    documents: [
      doc("doc-007-1", "Business registration", "bluebell-registration.jpg", "2026-09-02T04:40:00.000Z", "issue_noted_mock"),
    ],
    statusHistory: [
      { at: "2026-09-02T04:40:00.000Z", status: "pending", by: "Applicant" },
      { at: "2026-09-06T07:00:00.000Z", status: "rejected", by: "Kavya Raman", note: "Business registration document was illegible; applicant may re-apply (demo record)" },
    ],
  },
  {
    id: "sel-008", businessName: "Earthen Basket Farms", contactName: "Gayathri Rao", email: "earthen.basket@example.com", phone: "+91 90000 20008",
    city: "Hosur", state: "Tamil Nadu", appliedAt: "2026-10-26T11:20:00.000Z", status: "pending", rating: null, ratingCount: 0,
    categoryIds: ["cat-leafy-greens"],
    documents: [doc("doc-008-1", "Business registration", "earthen-registration.pdf", "2026-10-26T11:20:00.000Z")],
    statusHistory: [{ at: "2026-10-26T11:20:00.000Z", status: "pending", by: "Applicant" }],
  },
];
