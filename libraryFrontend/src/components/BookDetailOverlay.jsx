// src/components/BookDetailOverlay.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SearchableDropdown from "./SearchableDropdown";
import Modal from "./Modal";
import { MembersContext } from "./MembersContext";
import Icon from "./Icon";
import { formatDate } from "../utils/formatDate";
import {
  issueBook,
  addMember,
  editBook,
  deleteBook,
  getActiveLoans,
  returnLoan,
  addToWaitlist,
} from "../api/api";
import BookCard from "./BookCard";
import styles from "./BookDetailOverlay.module.css";

export default function BookDetailOverlay({
  book,
  onClose,
  onUpdate,
  onDelete,
  isAdmin,
}) {
  const navigate = useNavigate();
  const { members, setMembers, load: loadMembers } = useContext(MembersContext);

  const [activeSubView, setActiveSubView] = useState(null); // 'issue' | 'return' | 'edit'
  const [issueMemberId, setIssueMemberId] = useState(null);
  const [showMiniForm, setShowMiniForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [miniName, setMiniName] = useState("");
  const [miniEmail, setMiniEmail] = useState("");
  const [miniPhone, setMiniphone] = useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    genre: "",
    isbn: "",
    total_copies: 1,
    cover_image_url: "",
  });

  const [bookActiveLoans, setBookActiveLoans] = useState([]);
  const [selectedReturnLoan, setSelectedReturnLoan] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteQuantity, setDeleteQuantity] = useState(1);

  const [reserveMemberId, setReserveMemberId] = useState(null);

  // Inline feedback banner shown at the top of the modal
  const [banner, setBanner] = useState(null); // { type: 'success'|'error'|'info', text }
  const bannerTimer = useRef(null);

  function showBanner(type, text, autoHide = true) {
    setBanner({ type, text });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (autoHide) {
      bannerTimer.current = setTimeout(() => setBanner(null), 4000);
    }
  }

  // Show a success banner in the modal, then close it shortly after
  function closeAfterBanner(text) {
    showBanner("success", text, false);
    setTimeout(() => {
      setBanner(null);
      onClose();
    }, 1600);
  }

  useEffect(() => () => clearTimeout(bannerTimer.current), []);

  const todayStr = formatDate(new Date().toISOString());

  // Prefill forms and load dropdown data on mount
  useEffect(() => {
    if (book) {
      setEditForm({
        title: book.title || "",
        author: book.author || "",
        genre: book.genre || "",
        isbn: book.isbn || "",
        total_copies: book.total_copies || 1,
        cover_image_url: book.cover_image_url || "",
      });
      setActiveSubView(null);
      setIssueMemberId(null);
      setShowMiniForm(false);
      if (isAdmin) loadMembers();
    }
  }, [book, isAdmin]);

  // Fetch active loans when return sub-view opens
  useEffect(() => {
    if (activeSubView === "return" && book) {
      setLoading(true);
      getActiveLoans()
        .then((loans) => {
          const filtered = loans.filter((l) => l.book_id === book.id);
          setBookActiveLoans(filtered);
          setSelectedReturnLoan(filtered.length > 0 ? filtered[0] : null);
        })
        .catch((err) =>
          showBanner("error", "Failed to load active loans for this book"),
        )
        .finally(() => setLoading(false));
    }
  }, [activeSubView, book]);

  if (!book) return null;

  const isAvailable = book.available_copies > 0;

  // Cover URL helper
  const coverUrl = book.cover_image_url
    ? book.cover_image_url.startsWith("http")
      ? book.cover_image_url
      : `http://localhost:5005${book.cover_image_url}`
    : "/placeholder-cover.svg";

  // --- Handlers ---
  async function handleIssueSubmit(e) {
    e.preventDefault();
    if (!issueMemberId) {
      showBanner("error", "Please select a member");
      return;
    }
    setLoading(true);
    try {
      await issueBook({ user_id: issueMemberId, book_id: book.id });
      onUpdate({ ...book, available_copies: book.available_copies - 1 });
      setIssueMemberId(null);
      closeAfterBanner("Book issued successfully!");
    } catch (err) {
      showBanner("error", err.message || "Failed to issue book");
    } finally {
      setLoading(false);
    }
  }

  async function handleMiniRegister(e) {
    e.preventDefault();
    if (!miniName || !miniEmail) {
      showBanner("error", "Name and Email are required");
      return;
    }
    setLoading(true);
    try {
      const res = await addMember({
        name: miniName,
        email: miniEmail,
        phone: miniPhone,
      });
      const newMember = {
        id: res.member_id,
        name: miniName,
        email: miniEmail,
        phone: miniPhone,
        membership_status: "active",
        active_loans: 0,
      };
      if (members) setMembers((prev) => [...prev, newMember]);
      else setMembers([newMember]);
      setIssueMemberId(res.member_id);
      setShowMiniForm(false);
      setMiniName("");
      setMiniEmail("");
      setMiniphone("");
      showBanner("success", `Registered and selected: ${newMember.name}`);
    } catch (err) {
      showBanner("error", err.message || "Failed to register member");
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnConfirm(e) {
    e.preventDefault();
    if (!selectedReturnLoan) return;
    setLoading(true);
    try {
      const result = await returnLoan(selectedReturnLoan.loan_id);
      let msg = result.fine_amount > 0
        ? `Book returned. Fine of Rs.${result.fine_amount} raised.`
        : "Book returned. No fine.";
      if (result.reservation_msg) msg += ` ${result.reservation_msg}`;
      else if (result.message && result.message.includes("Reservation"))
        msg += ` ${result.message}`;
      onUpdate({ ...book, available_copies: book.available_copies + 1 });
      setSelectedReturnLoan(null);
      closeAfterBanner(msg);
    } catch (err) {
      showBanner("error", err.message || "Return failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await editBook(book.id, editForm);
      onUpdate({
        ...book,
        ...editForm,
        available_copies:
          book.available_copies + (editForm.total_copies - book.total_copies),
      });
      closeAfterBanner("Book details updated");
    } catch (err) {
      showBanner("error", err.message || "Failed to update book");
    } finally {
      setLoading(false);
    }
  }

  async function handleReserveSubmit(e) {
    e.preventDefault();
    if (!reserveMemberId) {
      showBanner("error", "Please select a member");
      return;
    }
    setLoading(true);
    try {
      const result = await addToWaitlist({ user_id: reserveMemberId, book_id: book.id });
      setReserveMemberId(null);
      closeAfterBanner(`Member added to waitlist. Position: ${result.queue_position}`);
    } catch (err) {
      showBanner("error", err.message || "Failed to add reservation");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteReason.trim()) {
      showBanner("error", "Please provide a reason for deletion");
      return;
    }
    setLoading(true);
    try {
      const result = await deleteBook(book.id, {
        reason: deleteReason,
        quantity: -deleteQuantity
      });
      let msg;
      if (result.deleted) {
        msg = "Book deleted completely";
        onDelete(book.id);
      } else {
        msg = result.message;
        onUpdate({
          ...book,
          total_copies: result.new_total,
          available_copies: result.new_available
        });
      }
      setShowDeleteConfirm(false);
      setDeleteReason("");
      setDeleteQuantity(1);
      closeAfterBanner(msg);
    } catch (err) {
      showBanner("error", err.message || "Failed to delete book");
    } finally {
      setLoading(false);
    }
  }

  // Return details calculation
  let returnDaysOverdue = 0,
    returnFine = 0;
  if (selectedReturnLoan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(selectedReturnLoan.due_date);
    const diff = today - dueDate;
    if (diff > 0) {
      returnDaysOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (returnDaysOverdue > 2) returnFine = (returnDaysOverdue - 2) * 10;
    }
  }

  // Inline feedback banner (rendered at the top of every panel)
  const bannerEl = banner ? (
    <div
      className={`${styles.feedbackBanner} ${
        banner.type === "success"
          ? styles.bannerSuccess
          : banner.type === "info"
            ? styles.bannerInfo
            : styles.bannerError
      }`}
      role="status"
    >
      {banner.text}
    </div>
  ) : null;

  // ==========================================
  // ISSUE VIEW - uses same layout as main panel
  // Left: Book card (cover + genre/ISBN)    Right: Issue form
  // ==========================================
  if (activeSubView === "issue") {
    return (
      <div
        className={styles.overlay}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <div className={styles.issuePanel} onClick={(e) => e.stopPropagation()}>
          {bannerEl}
          <div className={styles.issueHeader}>
            <button
              className={styles.returnLink}
              onClick={() => setActiveSubView(null)}
            >
              <Icon name="arrowLeft" className={styles.returnArrow} />
              <span>Return to Book Details</span>
            </button>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className={styles.issueBody}>
            {/* LEFT: Book card - same as main panel */}
            <div className={styles.left}>
              <BookCard book={book} disableClick />
            </div>

            {/* RIGHT: Issue form - centered, narrow */}
            <div className={styles.right}>
              <form onSubmit={handleIssueSubmit} className={styles.issueForm}>
                <h4 className={styles.issueFormTitle}>Issue Book</h4>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Member</label>
                  <SearchableDropdown
                    options={members || []}
                    placeholder="Type member name or email..."
                    onSelect={(id) => setIssueMemberId(id)}
                    initialSelectedId={issueMemberId}
                  />
                </div>

                {!showMiniForm ? (
                  <div className={styles.addMemberPrompt}>
                    <span>Member not found?</span>
                    <button
                      type="button"
                      className={styles.btnAddMember}
                      onClick={() => setShowMiniForm(true)}
                    >
                      Add member
                    </button>
                  </div>
                ) : (
                  <div className={styles.addMemberForm}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Name *</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={miniName}
                        onChange={(e) => setMiniName(e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Email *</label>
                      <input
                        type="email"
                        className={styles.input}
                        value={miniEmail}
                        onChange={(e) => setMiniEmail(e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Phone</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={miniPhone}
                        onChange={(e) => setMiniphone(e.target.value)}
                        placeholder="Mobile number"
                      />
                    </div>
                    <div className={styles.addMemberActions}>
                      <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={() => {
                          setShowMiniForm(false);
                          setMiniName("");
                          setMiniEmail("");
                          setMiniphone("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={styles.btnRegister}
                        onClick={handleMiniRegister}
                        disabled={loading}
                      >
                        {loading ? "Registering..." : "Register Member"}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={loading || !issueMemberId}
                >
                  {loading ? "Issuing..." : "Confirm Issue"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RETURN VIEW - same top-level swap behavior as issue view
  // ==========================================
  if (activeSubView === "return") {
    return (
      <div
        className={styles.overlay}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <div
          className={styles.returnPanel}
          onClick={(e) => e.stopPropagation()}
        >
          {bannerEl}
          <div className={styles.issueHeader}>
            <button
              className={styles.returnLink}
              onClick={() => setActiveSubView(null)}
            >
              <Icon name="arrowLeft" className={styles.returnArrow} />
              <span>Return to Book Details</span>
            </button>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className={styles.returnBody}>
            {/* LEFT: Book card */}
            <div className={styles.left}>
              <BookCard book={book} disableClick />
            </div>

            {/* RIGHT: Return form */}
            <div className={styles.right}>
              <div className={styles.subView}>
                <h4 className={styles.subTitle}>Mark as Returned</h4>
                {loading ? (
                  <div>Loading active loans...</div>
                ) : bookActiveLoans.length === 0 ? (
                  <div className={styles.noLoansMsg}>
                    No active loans for this book.
                  </div>
                ) : (
                  <form onSubmit={handleReturnConfirm} className={styles.form}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Select loan to return
                      </label>
                      <select
                        className={styles.input}
                        value={
                          selectedReturnLoan ? selectedReturnLoan.loan_id : ""
                        }
                        onChange={(e) => {
                          const match = bookActiveLoans.find(
                            (l) => l.loan_id === Number(e.target.value),
                          );
                          setSelectedReturnLoan(match || null);
                        }}
                      >
                        {bookActiveLoans.map((l) => (
                          <option key={l.loan_id} value={l.loan_id}>
                            {l.user_name} (Issued: {formatDate(l.issue_date)})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedReturnLoan && (
                      <div className={styles.returnDetails}>
                        <div className={styles.returnRow}>
                          <span className={styles.returnKey}>Due Date:</span>
                          <span className={styles.returnValue}>
                            {formatDate(selectedReturnLoan.due_date)}
                          </span>
                        </div>
                        <div className={styles.returnRow}>
                          <span className={styles.returnKey}>Return Date:</span>
                          <span className={styles.returnValue}>
                            {todayStr} (Today)
                          </span>
                        </div>
                        <div className={styles.returnRow}>
                          <span className={styles.returnKey}>Days Overdue:</span>
                          <span className={styles.returnValue}>
                            {returnDaysOverdue} day(s)
                          </span>
                        </div>
                        <hr className={styles.returnDivider} />
                        <div className={styles.returnRow}>
                          <span className={styles.returnKey}>Grace period:</span>
                          <span className={styles.returnHighlight}>2 Days</span>
                        </div>
                        <div className={styles.returnRow}>
                          <span className={styles.returnKey}>Fines raised:</span>
                          <span
                            className={`${styles.returnValue} ${returnFine > 0 ? styles.fineDanger : styles.fineOk}`}
                          >
                            Rs.{returnFine.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      type="submit"
                      className={styles.btnSubmit}
                      disabled={loading || !selectedReturnLoan}
                    >
                      {loading ? "Processing..." : "Confirm Return"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // EDIT VIEW - same layout as issue/return view
  // ==========================================
  if (activeSubView === "edit") {
    return (
      <div
        className={styles.overlay}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <div className={styles.editPanel} onClick={(e) => e.stopPropagation()}>
          {bannerEl}
          <div className={styles.issueHeader}>
            <button
              className={styles.returnLink}
              onClick={() => setActiveSubView(null)}
            >
              <Icon name="arrowLeft" className={styles.returnArrow} />
              <span>Return to Book Details</span>
            </button>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className={styles.editBody}>
            {/* LEFT: Book card */}
            <div className={styles.left}>
              <BookCard book={book} disableClick />
            </div>

            {/* RIGHT: Edit form */}
            <div className={styles.right}>
              <h4 className={styles.issueFormTitle}>Edit Book Details</h4>
              <form onSubmit={handleEditSubmit} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Book Title *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Author *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editForm.author}
                    onChange={(e) =>
                      setEditForm({ ...editForm, author: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Genre</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm.genre}
                      onChange={(e) =>
                        setEditForm({ ...editForm, genre: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>ISBN</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm.isbn}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isbn: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Total Copies *</label>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      value={editForm.total_copies}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          total_copies: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cover URL</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm.cover_image_url}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          cover_image_url: e.target.value,
                        })
                      }
                      placeholder="/static/covers/..."
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RESERVE VIEW - add member to waitlist
  // ==========================================
  if (activeSubView === "reserve") {
    return (
      <div
        className={styles.overlay}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <div className={styles.reservePanel} onClick={(e) => e.stopPropagation()}>
          {bannerEl}
          <div className={styles.issueHeader}>
            <button
              className={styles.returnLink}
              onClick={() => setActiveSubView(null)}
            >
              <Icon name="arrowLeft" className={styles.returnArrow} />
              <span>Return to Book Details</span>
            </button>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className={styles.reserveBody}>
            {/* LEFT: Book card */}
            <div className={styles.left}>
              <BookCard book={book} disableClick />
            </div>

            {/* RIGHT: Reserve form */}
            <div className={styles.right}>
              <form onSubmit={handleReserveSubmit} className={styles.issueForm}>
                <h4 className={styles.issueFormTitle}>Add to Waitlist</h4>
                <div className={styles.stockOutNotice}>
                  <Icon name="alertCircle" className={styles.noticeIcon} />
                  <span>All copies are currently issued. Add member to reservation queue.</span>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Member</label>
                  <SearchableDropdown
                    options={members || []}
                    placeholder="Type member name or email..."
                    onSelect={(id) => setReserveMemberId(id)}
                    initialSelectedId={reserveMemberId}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.btnReserveSubmit}
                  disabled={loading || !reserveMemberId}
                >
                  {loading ? "Adding..." : "Add to Waitlist"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN OVERLAY â€" book detail view
  // ==========================================
  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {bannerEl}
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <div className={styles.body}>
          {/* Left: Book Card */}
          <div className={styles.left}>
            <BookCard book={book} disableClick />
          </div>

          {/* Right: Details + Actions */}
          <div className={styles.right}>
            <span className={styles.panelTitle}>Book Specifications</span>

            <h3 className={styles.title}>{book.title}</h3>
            <div className={styles.author}>by {book.author || "Unknown"}</div>
            {book.genre && (
              <span className={styles.genreTag}>{book.genre}</span>
            )}

            <div className={styles.meta}>
              <div className={styles.metaBox}>
                <span className={styles.metaLabel}>ISBN</span>
                <span className={styles.metaValue}>{book.isbn || "N/A"}</span>
              </div>
              <div className={styles.metaBox}>
                <span className={styles.metaLabel}>Total Copies</span>
                <span className={styles.metaValue}>{book.total_copies}</span>
              </div>
              <div className={styles.metaBox}>
                <span className={styles.metaLabel}>Available</span>
                <span
                  className={`${styles.metaValue} ${isAvailable ? styles.metaAvailable : styles.metaUnavailable}`}
                >
                  {book.available_copies}
                </span>
              </div>
              <div className={styles.metaBox}>
                <span className={styles.metaLabel}>Status</span>
                <span
                  className={`${styles.metaValue} ${isAvailable ? styles.metaAvailable : styles.metaUnavailable}`}
                >
                  {isAvailable ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>

            {/* Action buttons â€" admin only */}
            {isAdmin && (
              <>
                <div className={styles.actionGrid}>
                  {isAvailable ? (
                    <button
                      className={`${styles.btnAction} ${styles.btnIssue}`}
                      onClick={() => setActiveSubView("issue")}
                    >
                      <Icon name="book" className={styles.btnIcon} />
                      <span>Issue Book</span>
                    </button>
                  ) : (
                    <button
                      className={`${styles.btnAction} ${styles.btnReserve}`}
                      onClick={() => setActiveSubView("reserve")}
                    >
                      <Icon name="bookmark" className={styles.btnIcon} />
                      <span>Add Reservation</span>
                    </button>
                  )}
                  <button
                    className={`${styles.btnAction} ${styles.btnReturn}`}
                    onClick={() => setActiveSubView("return")}
                  >
                    <Icon name="return" className={styles.btnIcon} />
                    <span>Mark Returned</span>
                  </button>
                  <button
                    className={`${styles.btnAction} ${styles.btnEdit}`}
                    onClick={() => setActiveSubView("edit")}
                  >
                    <Icon name="edit" className={styles.btnIcon} />
                    <span>Edit Details</span>
                  </button>
                  <button
                    className={`${styles.btnAction} ${styles.btnDelete}`}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Icon name="trash" className={styles.btnIcon} />
                    <span>Delete Book</span>
                  </button>
                </div>

                {/* Delete Book Modal */}
                <Modal
                  isOpen={showDeleteConfirm}
                  onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeleteReason("");
                    setDeleteQuantity(1);
                  }}
                  title="Remove Book Copies"
                >
                  <div className={styles.deleteModal}>
                    <p className={styles.deleteWarning}>
                      You are about to remove copies of <strong>"{book.title}"</strong>
                    </p>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Quantity to Remove *</label>
                      <input
                        type="number"
                        min="1"
                        max={book.total_copies}
                        className={styles.input}
                        value={deleteQuantity}
                        onChange={(e) => setDeleteQuantity(Math.min(Number(e.target.value), book.total_copies))}
                      />
                      <span className={styles.hint}>
                        Current total: {book.total_copies} copies
                        {deleteQuantity >= book.total_copies && (
                          <span style={{ color: "var(--verso-danger)", marginLeft: 8 }}>
                            (This will delete the book entirely)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Reason for Removal *</label>
                      <select
                        className={styles.input}
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                      >
                        <option value="">Select a reason...</option>
                        <option value="Damaged beyond repair">Damaged beyond repair</option>
                        <option value="Lost">Lost</option>
                        <option value="Outdated content">Outdated content</option>
                        <option value="Duplicate entry">Duplicate entry</option>
                        <option value="Inventory correction">Inventory correction</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {deleteReason === "Other" && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Specify Reason *</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Enter custom reason..."
                          onChange={(e) => setDeleteReason(e.target.value)}
                        />
                      </div>
                    )}
                    <div className={styles.deleteActions}>
                      <button
                        className={styles.btnCancel}
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteReason("");
                          setDeleteQuantity(1);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.btnDanger}
                        onClick={handleDeleteConfirm}
                        disabled={loading || !deleteReason.trim()}
                      >
                        {loading ? "Removing..." : `Remove ${deleteQuantity} Copy${deleteQuantity > 1 ? "ies" : ""}`}
                      </button>
                    </div>
                  </div>
                </Modal>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
