// src/api/api.js

const BASE_URL = 'http://localhost:5005/api';

// Helper to handle response and throw errors
async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = 'API request failed';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

// Helper to attach headers
function getHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

/* ==========================================
   AUTH ENDPOINTS (Database-backed)
   ========================================== */

export async function login({ email, password, role }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });

  const data = await handleResponse(res);

  // Use sessionStorage for user session to allow simultaneous logins in different windows
  sessionStorage.setItem('verso_user', JSON.stringify(data.user));

  return { user: data.user };
}

export async function register({ name, email, phone, password }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password, role: 'member' })
  });

  return handleResponse(res);
}

export function logout() {
  sessionStorage.removeItem('verso_user');
}

export function getCurrentUser() {
  const userStr = sessionStorage.getItem('verso_user');
  return userStr ? JSON.parse(userStr) : null;
}

export async function checkEmail(email) {
  const res = await fetch(`${BASE_URL}/auth/check-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return handleResponse(res);
}

export async function resetPassword({ email, new_password }) {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, new_password })
  });
  return handleResponse(res);
}


/* ==========================================
   BOOKS ENDPOINTS
   ========================================== */

// Client-side overrides/edits/deletions store
function getBookOverrides() {
  return JSON.parse(localStorage.getItem('verso_book_overrides') || '{"edited": {}, "deleted": []}');
}

function saveBookOverrides(overrides) {
  localStorage.setItem('verso_book_overrides', JSON.stringify(overrides));
}

export async function getBooks(searchQuery = '') {
  try {
    const res = await fetch(`${BASE_URL}/admin/books`, {
      method: 'GET',
      headers: getHeaders()
    });
    let books = await handleResponse(res);
    
    // Apply client-side overrides
    const overrides = getBookOverrides();
    // Filter out deleted books
    books = books.filter(b => !overrides.deleted.includes(b.id));
    // Apply edited properties
    books = books.map(b => {
      if (overrides.edited[b.id]) {
        return { ...b, ...overrides.edited[b.id] };
      }
      return b;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      books = books.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q) || 
        (b.genre && b.genre.toLowerCase().includes(q)) || 
        (b.isbn && b.isbn.toLowerCase().includes(q))
      );
    }
    return books;
  } catch (error) {
    console.error('getBooks error:', error);
    throw error;
  }
}

export async function addBook(bookData) {
  const res = await fetch(`${BASE_URL}/admin/books`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(bookData)
  });
  return handleResponse(res);
}

export async function uploadCover(file) {
  const formData = new FormData();
  formData.append('cover', file);

  const res = await fetch(`${BASE_URL}/admin/upload-cover`, {
    method: 'POST',
    body: formData
  });
  return handleResponse(res);
}

export async function editBook(bookId, bookData) {
  const res = await fetch(`${BASE_URL}/admin/books/${bookId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(bookData)
  });
  return handleResponse(res);
}

export async function deleteBook(bookId, { reason, quantity } = {}) {
  const res = await fetch(`${BASE_URL}/admin/books/${bookId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ reason, quantity })
  });
  return handleResponse(res);
}


/* ==========================================
   MEMBERS ENDPOINTS
   ========================================== */

function getMemberOverrides() {
  return JSON.parse(localStorage.getItem('verso_member_overrides') || '{"edited": {}, "deleted": []}');
}

function saveMemberOverrides(overrides) {
  localStorage.setItem('verso_member_overrides', JSON.stringify(overrides));
}

export async function getMembers(searchQuery = '') {
  const res = await fetch(`${BASE_URL}/admin/members`, {
    method: 'GET',
    headers: getHeaders()
  });
  let members = await handleResponse(res);

  // Apply client-side overrides
  const overrides = getMemberOverrides();
  members = members.filter(m => !overrides.deleted.includes(m.id));
  members = members.map(m => {
    if (overrides.edited[m.id]) {
      return { ...m, ...overrides.edited[m.id] };
    }
    return m;
  });

  // Include local-only signed up members (to ensure login credentials match actual member list)
  const users = JSON.parse(localStorage.getItem('verso_users') || '[]');
  const localMembers = users.filter(u => u.role === 'member');
  localMembers.forEach(lm => {
    if (!members.some(m => m.email === lm.email) && !overrides.deleted.includes(lm.id)) {
      // Find active loans if any
      members.push({
        id: lm.id,
        name: lm.name,
        email: lm.email,
        phone: lm.phone,
        membership_status: lm.membership_status,
        active_loans: 0
      });
    }
  });

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    members = members.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.email.toLowerCase().includes(q) ||
      (m.phone && m.phone.toLowerCase().includes(q))
    );
  }
  return members;
}

export async function addMember(memberData) {
  const res = await fetch(`${BASE_URL}/admin/members`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(memberData)
  });
  const data = await handleResponse(res);
  
  // Save member credentials in verso_users for login simulation
  const users = JSON.parse(localStorage.getItem('verso_users') || '[]');
  if (!users.some(u => u.email === memberData.email)) {
    users.push({
      id: data.member_id,
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone || '',
      password: 'password', // Default dummy password
      role: 'member',
      membership_status: 'active'
    });
    localStorage.setItem('verso_users', JSON.stringify(users));
  }

  return data;
}

export async function editMember(memberId, memberData) {
  console.log(`PUT /api/admin/members/${memberId} - STUBBED on backend, saving locally`);
  await new Promise(r => setTimeout(r, 300));

  const overrides = getMemberOverrides();
  overrides.edited[memberId] = {
    ...overrides.edited[memberId],
    ...memberData
  };
  saveMemberOverrides(overrides);

  // Update in users database as well for login matching
  const users = JSON.parse(localStorage.getItem('verso_users') || '[]');
  const userIdx = users.findIndex(u => u.id === Number(memberId));
  if (userIdx !== -1) {
    users[userIdx] = { ...users[userIdx], ...memberData };
    localStorage.setItem('verso_users', JSON.stringify(users));
  }

  return { message: 'Member updated successfully (locally)', id: memberId };
}

export async function deleteMember(memberId) {
  console.log(`DELETE /api/admin/members/${memberId} - STUBBED on backend, saving locally`);
  await new Promise(r => setTimeout(r, 300));

  const overrides = getMemberOverrides();
  if (!overrides.deleted.includes(memberId)) {
    overrides.deleted.push(memberId);
  }
  saveMemberOverrides(overrides);

  return { message: 'Member deleted successfully (locally)' };
}


/* ==========================================
   LOANS ENDPOINTS
   ========================================== */

function getLoanOverrides() {
  return JSON.parse(localStorage.getItem('verso_loan_overrides') || '{"renewed": {}, "returned": []}');
}

function saveLoanOverrides(overrides) {
  localStorage.setItem('verso_loan_overrides', JSON.stringify(overrides));
}

export async function getActiveLoans() {
  const res = await fetch(`${BASE_URL}/admin/loans/active`, {
    method: 'GET',
    headers: getHeaders()
  });
  let loans = await handleResponse(res);

  // Apply local overrides
  const overrides = getLoanOverrides();
  // Filter out locally returned loans
  loans = loans.filter(l => !overrides.returned.includes(l.loan_id));
  // Apply renewal overrides
  loans = loans.map(l => {
    if (overrides.renewed[l.loan_id]) {
      return { ...l, ...overrides.renewed[l.loan_id] };
    }
    return l;
  });

  return loans;
}

export async function getOverdueLoans() {
  // Calculated dynamically from active loans to keep database integration working!
  console.log('GET /api/admin/loans/overdue - STUBBED on backend, calculated from active list');
  const activeLoans = await getActiveLoans();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = activeLoans.filter(loan => {
    const dueDate = new Date(loan.due_date);
    return today > dueDate;
  }).map(loan => {
    const dueDate = new Date(loan.due_date);
    const diffTime = Math.abs(today - dueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      ...loan,
      status: 'overdue',
      days_overdue: diffDays
    };
  }).sort((a, b) => b.days_overdue - a.days_overdue);

  return overdue;
}

export async function issueBook({ user_id, book_id }) {
  const res = await fetch(`${BASE_URL}/admin/loans/issue`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: Number(user_id), book_id: Number(book_id) })
  });
  return handleResponse(res);
}

export async function returnLoan(loanId) {
  // Try to submit to backend
  try {
    const res = await fetch(`${BASE_URL}/admin/loans/${loanId}/return`, {
      method: 'POST',
      headers: getHeaders()
    });
    const result = await handleResponse(res);
    
    // Save locally returned ID to sync active loans
    const overrides = getLoanOverrides();
    overrides.returned.push(Number(loanId));
    saveLoanOverrides(overrides);

    // If there is a fine generated, add to mock fines
    if (result.fine_amount > 0) {
      addMockFine({
        loan_id: loanId,
        user_id: result.user_id, // we might need to find user_id
        amount: result.fine_amount
      });
    }

    return result;
  } catch (error) {
    // If backend fails or not found, do full local return mock
    console.error('Backend return error, fallback to local mock:', error);
    
    const active = await getActiveLoans();
    const loan = active.find(l => l.loan_id === Number(loanId));
    if (!loan) throw new Error('Loan not found');

    const overrides = getLoanOverrides();
    overrides.returned.push(Number(loanId));
    saveLoanOverrides(overrides);

    // Calculate fine
    const today = new Date();
    const dueDate = new Date(loan.due_date);
    let fineAmount = 0;
    let daysOverdue = 0;
    
    if (today > dueDate) {
      const diffTime = Math.abs(today - dueDate);
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Grace period = 2 days, Rate = ₹10/day
      if (daysOverdue > 2) {
        fineAmount = (daysOverdue - 2) * 10;
      }
    }

    if (fineAmount > 0) {
      addMockFine({
        loan_id: loan.loan_id,
        user_id: loan.user_id,
        amount: fineAmount,
        book_title: loan.book_title,
        user_name: loan.user_name
      });
    }

    // Process reservations queue if any
    const reservations = JSON.parse(localStorage.getItem('verso_reservations') || '[]');
    const nextReservation = reservations.find(r => r.book_id === loan.book_id && r.status === 'waiting');
    let reservationMessage = null;
    if (nextReservation) {
      nextReservation.status = 'ready';
      localStorage.setItem('verso_reservations', JSON.stringify(reservations));
      
      // Get member name
      const members = await getMembers();
      const nextMember = members.find(m => m.id === nextReservation.user_id);
      reservationMessage = `Reservation #${nextReservation.id} marked ready for ${nextMember ? nextMember.name : 'Member'}.`;
    }

    return {
      message: 'Book returned successfully (locally)',
      loan_id: loanId,
      return_date: today.toISOString().split('T')[0],
      fine_amount: fineAmount,
      reservation_msg: reservationMessage
    };
  }
}

/* ==========================================
   WAITLIST ENDPOINTS
   ========================================== */

export async function addToWaitlist({ user_id, book_id }) {
  try {
    const res = await fetch(`${BASE_URL}/admin/reservations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ user_id: Number(user_id), book_id: Number(book_id) })
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Waitlist POST error, mock client-side:', error);
    
    const reservations = JSON.parse(localStorage.getItem('verso_reservations') || '[]');
    const bookReservations = reservations.filter(r => r.book_id === Number(book_id) && r.status === 'waiting');
    const queuePosition = bookReservations.length + 1;

    const newRes = {
      id: Date.now(),
      book_id: Number(book_id),
      user_id: Number(user_id),
      requested_at: new Date().toISOString(),
      status: 'waiting'
    };

    reservations.push(newRes);
    localStorage.setItem('verso_reservations', JSON.stringify(reservations));

    return {
      message: 'Member added to waitlist (locally)',
      reservation_id: newRes.id,
      queue_position: queuePosition
    };
  }
}

export async function getReservationsByBook(bookId) {
  const res = await fetch(`${BASE_URL}/admin/reservations/${bookId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  const data = await handleResponse(res);

  // Map backend response to frontend expected format
  return data.queue.map(r => ({
    position: r.queue_position,
    id: r.reservation_id,
    user_id: r.user_id,
    member_name: r.user_name,
    email: r.email || '',
    added_at: r.requested_at,
    status: r.status
  }));
}


/* ==========================================
   FINES ENDPOINTS
   ========================================== */

function getMockFines() {
  if (!localStorage.getItem('verso_fines')) {
    localStorage.setItem('verso_fines', JSON.stringify([
      {
        id: 501,
        loan_id: 12,
        user_id: 1001,
        user_name: 'Jane Doe',
        book_title: 'Threads of Fate',
        amount: 80.00,
        paid: false,
        raised_at: '2026-06-20T10:00:00Z'
      },
      {
        id: 502,
        loan_id: 8,
        user_id: 1001,
        user_name: 'Jane Doe',
        book_title: 'Drew Feig',
        amount: 50.00,
        paid: true,
        raised_at: '2026-06-15T14:30:00Z',
        paid_at: '2026-06-16T11:00:00Z'
      }
    ]));
  }
  return JSON.parse(localStorage.getItem('verso_fines'));
}

function addMockFine({ loan_id, user_id, amount, book_title, user_name }) {
  const fines = getMockFines();
  fines.push({
    id: Date.now(),
    loan_id: Number(loan_id),
    user_id: Number(user_id),
    user_name: user_name || 'Member',
    book_title: book_title || 'Book',
    amount: Number(amount),
    paid: false,
    raised_at: new Date().toISOString()
  });
  localStorage.setItem('verso_fines', JSON.stringify(fines));
}

export async function getFines() {
  try {
    const res = await fetch(`${BASE_URL}/admin/fines`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  } catch (error) {
    console.log('getFines backend error, falling back to local:', error);
    return getMockFines();
  }
}

export async function payFine(fineId) {
  try {
    const res = await fetch(`${BASE_URL}/admin/fines/${fineId}/pay`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  } catch (error) {
    console.log('payFine backend error, falling back to local:', error);
    const fines = getMockFines();
    const fine = fines.find(f => f.id === Number(fineId));
    if (fine) {
      fine.paid = true;
      fine.paid_at = new Date().toISOString();
      localStorage.setItem('verso_fines', JSON.stringify(fines));
      return { message: 'Fine paid successfully', fine_id: fineId };
    }
    throw new Error('Fine not found');
  }
}


/* ==========================================
   MEMBER PORTAL SPECIFIC ENDPOINTS
   ========================================== */

export async function getMemberLoans(userId) {
  console.log(`GET /api/member/loans?user_id=${userId} - STUBBED on backend, computed from active list`);
  const active = await getActiveLoans();
  return active.filter(l => l.user_id === Number(userId));
}

export async function renewLoan(loanId) {
  console.log(`POST /api/member/loans/${loanId}/renew - STUBBED on backend, renewing locally`);
  await new Promise(r => setTimeout(r, 400));
  
  const active = await getActiveLoans();
  const loan = active.find(l => l.loan_id === Number(loanId));
  if (!loan) throw new Error('Loan not found');

  if (loan.renewal_count >= 2) {
    throw new Error('Maximum renewals reached (2)');
  }

  // Check waitlist reservations on this book
  const reservations = JSON.parse(localStorage.getItem('verso_reservations') || '[]');
  const hasWaitlist = reservations.some(r => r.book_id === loan.book_id && r.status === 'waiting');
  if (hasWaitlist) {
    throw new Error('Cannot renew — someone is waiting for this book');
  }

  const overrides = getLoanOverrides();
  
  // Calculate new due date (+14 days from current due date)
  const currentDueDate = new Date(loan.due_date);
  currentDueDate.setDate(currentDueDate.getDate() + 14);
  const newDueDateStr = currentDueDate.toISOString().split('T')[0];

  overrides.renewed[loanId] = {
    ...overrides.renewed[loanId],
    renewal_count: (loan.renewal_count || 0) + 1,
    due_date: newDueDateStr
  };
  saveLoanOverrides(overrides);

  return {
    message: 'Loan renewed successfully',
    loan_id: loanId,
    new_due_date: newDueDateStr
  };
}

export async function getMemberFines(userId) {
  console.log(`GET /api/member/fines?user_id=${userId} - STUBBED on backend, loading locally`);
  await new Promise(r => setTimeout(r, 300));
  const fines = getMockFines();
  return fines.filter(f => f.user_id === Number(userId));
}

export async function getMemberReservations(userId) {
  try {
    const res = await fetch(`${BASE_URL}/member/reservations/${userId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  } catch (error) {
    console.log('getMemberReservations error, returning empty array:', error);
    return [];
  }
}
