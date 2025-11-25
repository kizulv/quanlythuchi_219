import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  CreditCard,
  Calendar,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  Bus,
  Wallet,
  PieChart,
  Database,
  Edit,
  Menu,
  X,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  Transaction,
  TransactionStatus,
  PaymentCycle,
  Bus as BusType,
} from "../types";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { StatsCard } from "./StatsCard";
import { TransactionDetailModal } from "./TransactionDetailModal";
import { exportToExcel } from "../services/excelService";
import { db } from "../services/database";
import { ReconciliationSheet } from "./ReconciliationSheet";
import { PaymentModal } from "./PaymentModal";
import { PaymentManager } from "./PaymentManager";
import { BusManager } from "./BusManager";
import { toast } from "sonner";

type ViewState = "ledger" | "payments" | "buses";

export const Dashboard: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>("ledger");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Left Sidebar
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true); // Mobile/Desktop Right Sidebar Toggle

  // View State (Ledger)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [cycles, setCycles] = useState<PaymentCycle[]>([]);

  // All Time Stats State
  const [globalStats, setGlobalStats] = useState({
    totalAll: 0,
    shareAll: 0,
    totalYear: 0,
    shareYear: 0,
  });

  // Open Balance State (Specifically for Reconciliation)
  const [openBalance, setOpenBalance] = useState(0);

  // Selection State
  // null means "Current Open Cycle" (Unpaid items). string is a specific historical cycle ID.
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dropdown State
  const [isCyclePickerOpen, setIsCyclePickerOpen] = useState(false);

  // Modal State
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] =
    useState(false); // Mobile Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Payment Modal specific state (for edit mode)
  const [paymentModalTransactions, setPaymentModalTransactions] = useState<
    Transaction[]
  >([]);
  const [editingCycle, setEditingCycle] = useState<PaymentCycle | undefined>(
    undefined
  );

  // Helper to get sort function
  const sortFn = (a: Transaction, b: Transaction) => {
    const [da, ma, ya] = a.date.split("/").map(Number);
    const [db, mb, yb] = b.date.split("/").map(Number);
    return (
      new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime()
    );
  };

  // Initial Data Load & Responsive Check
  useEffect(() => {
    const loadMetadata = async () => {
      const loadedCycles = await db.getPaymentCycles();
      setCycles(loadedCycles);
    };
    loadMetadata();
  }, [isPaymentModalOpen, currentView]);

  // Transaction Data Load
  const fetchTransactions = async () => {
    if (currentView !== "ledger") return;

    setIsLoading(true);
    try {
      if (searchTerm.trim()) {
        const searchResults = await db.search(searchTerm);
        setTransactions(searchResults.sort(sortFn));
        setPrevTransactions([]);
      } else {
        const data = await db.getTransactionsByCycle(
          selectedCycleId || undefined
        );
        setTransactions(data.sort(sortFn));

        let prevData: Transaction[] = [];
        if (selectedCycleId) {
          const idx = cycles.findIndex((c) => c.id === selectedCycleId);
          if (idx !== -1 && idx < cycles.length - 1) {
            const prevCycleId = cycles[idx + 1].id;
            prevData = await db.getTransactionsByCycle(prevCycleId);
          }
        } else {
          if (cycles.length > 0) {
            prevData = await db.getTransactionsByCycle(cycles[0].id);
          }
        }
        setPrevTransactions(prevData);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedCycleId, searchTerm, cycles, currentView]);

  // Special Effect: Always Calculate Open Balance (Current Cycle) for Reconciliation
  useEffect(() => {
    const calcOpenBalance = async () => {
      const openItems = await db.getTransactionsByCycle(undefined);
      const total = openItems.reduce((acc, t) => acc + t.remainingBalance, 0);
      setOpenBalance(total);
    };
    calcOpenBalance();
  }, [transactions, isReconciliationModalOpen]);

  // Calculate Global All-Time Stats
  useEffect(() => {
    const fetchGlobalStats = async () => {
      const allTrans = await db.getAll();
      const buses = await db.getBuses();

      let totalAll = 0;
      let shareAll = 0;
      let totalYear = 0;
      let shareYear = 0;

      const currentYear = new Date().getFullYear();

      allTrans.forEach((t) => {
        // 1. Calculate Base Total
        totalAll += t.remainingBalance;

        // 2. Calculate Share Logic
        let shareAmount = 0;
        const busId = t.breakdown?.busId;
        const bus = buses.find((b) => b.licensePlate === busId);

        if (bus && bus.isShareholding) {
          // Shareholding Bus: Only calculate Owner's share percentage
          // Exclude shareholders (held portions) as per requirement
          shareAmount = (t.remainingBalance * bus.sharePercentage) / 100;
        } else {
          // Non-shareholding Bus: Assume 100% ownership of the remaining balance
          shareAmount = t.remainingBalance;
        }
        shareAll += shareAmount;

        // 3. Year Filter
        const parts = t.date.split("/");
        if (parts.length === 3) {
          const year = parseInt(parts[2]);
          if (year === currentYear) {
            totalYear += t.remainingBalance;
            shareYear += shareAmount;
          }
        }
      });

      setGlobalStats({
        totalAll,
        shareAll,
        totalYear,
        shareYear,
      });
    };

    // Refresh stats when transactions or view changes
    if (currentView === "ledger") {
      fetchGlobalStats();
    }
  }, [transactions, currentView]);

  const isLatestCycle = useMemo(() => {
    if (!selectedCycleId) return false;
    if (cycles.length === 0) return false;
    return selectedCycleId === cycles[0].id;
  }, [selectedCycleId, cycles]);

  // --- CYCLE NAVIGATION LOGIC ---
  const currentCycleIndex = useMemo(() => {
    if (!selectedCycleId) return -1;
    return cycles.findIndex((c) => c.id === selectedCycleId);
  }, [selectedCycleId, cycles]);

  const handlePrevCycle = () => {
    if (currentCycleIndex === -1) {
      if (cycles.length > 0) setSelectedCycleId(cycles[0].id);
    } else if (currentCycleIndex < cycles.length - 1) {
      setSelectedCycleId(cycles[currentCycleIndex + 1].id);
    }
  };

  const handleNextCycle = () => {
    if (currentCycleIndex === 0) {
      setSelectedCycleId(null);
    } else if (currentCycleIndex > 0) {
      setSelectedCycleId(cycles[currentCycleIndex - 1].id);
    }
  };

  const isPrevDisabled =
    cycles.length === 0 || currentCycleIndex === cycles.length - 1;

  const handleOpenPaymentModal = async () => {
    if (selectedCycleId && !isLatestCycle) {
      toast.info("Chỉ có thể chỉnh sửa kỳ thanh toán gần nhất.");
      return;
    }

    if (selectedCycleId && isLatestCycle) {
      const currentCycleItems = await db.getTransactionsByCycle(
        selectedCycleId
      );
      const openItems = await db.getTransactionsByCycle(undefined);
      const combinedData = [...currentCycleItems, ...openItems].sort(sortFn);

      setPaymentModalTransactions(combinedData);
      setEditingCycle(cycles.find((c) => c.id === selectedCycleId));
      setIsPaymentModalOpen(true);
    } else {
      const openItems = await db.getTransactionsByCycle(undefined);
      if (openItems.length === 0) {
        toast.error("Không có dữ liệu chưa thanh toán để tạo.");
        return;
      }
      setPaymentModalTransactions(openItems.sort(sortFn));
      setEditingCycle(undefined);
      setIsPaymentModalOpen(true);
    }
  };

  const handleConfirmPayment = async (
    selectedIds: string[],
    month: number,
    year: number,
    totalAmount: number,
    note: string
  ) => {
    try {
      if (editingCycle) {
        await db.updatePaymentCycle(
          editingCycle.id,
          selectedIds,
          totalAmount,
          note
        );
        toast.success(`Đã cập nhật thanh toán kỳ ${month}/${year}!`);
        await fetchTransactions();
      } else {
        await db.createPaymentCycle(
          selectedIds,
          month,
          year,
          totalAmount,
          note
        );
        toast.success(`Đã tạo thanh toán cho kỳ ${month}/${year}!`);
        const newCycleId = `${year}.${month.toString().padStart(2, "0")}`;
        if (currentView === "ledger") {
          setSelectedCycleId(newCycleId);
        }
      }
      setIsPaymentModalOpen(false);
      const loadedCycles = await db.getPaymentCycles();
      setCycles(loadedCycles);
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi xử lý thanh toán.");
    }
  };

  const stats = useMemo(() => {
    const totalRemaining = transactions.reduce(
      (acc, t) => acc + t.remainingBalance,
      0
    );
    return { totalRemaining, splitByFour: totalRemaining / 4 };
  }, [transactions]);

  const prevStats = useMemo(() => {
    const totalRemaining = prevTransactions.reduce(
      (acc, t) => acc + t.remainingBalance,
      0
    );
    return { totalRemaining, splitByFour: totalRemaining / 4 };
  }, [prevTransactions]);

  const isSearching = searchTerm.trim().length > 0;
  const diffTotal = isSearching
    ? 0
    : stats.totalRemaining - prevStats.totalRemaining;
  const diffSplit = isSearching ? 0 : stats.splitByFour - prevStats.splitByFour;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(Math.round(val));

  const handleOpenDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleAddTransaction = () => {
    if (selectedCycleId) {
      toast.warning("Vui lòng chuyển về 'Kỳ hiện tại' để thêm mới.");
      setSelectedCycleId(null);
      return;
    }

    const today = new Date();
    const dayStr = today.getDate().toString().padStart(2, "0");
    const monthStr = (today.getMonth() + 1).toString().padStart(2, "0");
    const yearStr = today.getFullYear();

    const newTransaction: Transaction = {
      id: "",
      date: `${dayStr}/${monthStr}/${yearStr}`,
      revenue: 0,
      sharedExpense: 0,
      totalBalance: 0,
      splitBalance: 0,
      privateExpense: 0,
      remainingBalance: 0,
      note: "",
      status: TransactionStatus.VERIFIED,
      details: "",
      isShared: false,
      breakdown: {
        revenueDown: 0,
        revenueUp: 0,
        revenueOther: 0,
        expenseFuel: 0,
        expenseFixed: 0,
        expensePolice: 0,
        expenseRepair: 0,
        expenseOther: 0,
        isShared: false,
        busId: "25F-002.19",
        partnerBusId: "25F-000.19",
      },
    };
    setSelectedTransaction(newTransaction);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (updatedTransaction: Transaction) => {
    try {
      if (updatedTransaction.status !== TransactionStatus.PAID) {
        updatedTransaction.paymentMonth = undefined;
      }
      await db.save(updatedTransaction);
      await fetchTransactions();
      setIsModalOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      alert("Có lỗi khi lưu dữ liệu.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await db.delete(id);
      await fetchTransactions();
      setIsModalOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      alert("Có lỗi khi xóa dữ liệu.");
    }
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    const label = isSearching ? "Tim_Kiem" : selectedCycleId || "Ky_Hien_Tai";
    exportToExcel(transactions, label);
  };

  const handleCheckExists = (dateStr: string) => {
    return transactions.find((t) => t.date === dateStr);
  };

  const handleSwitchToEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const getCurrentViewLabel = () => {
    if (isSearching) return `Kết quả tìm kiếm: "${searchTerm}"`;
    if (!selectedCycleId) {
      return `Kỳ hiện tại (Chưa chốt sổ)`;
    }
    return `Kỳ thanh toán ${selectedCycleId}`;
  };

  const getCycleAmountDisplay = (c: PaymentCycle) => {
    return `${formatCurrency(c.totalAmount)} k`;
  };

  const getSelectedTransactionPaymentDate = () => {
    if (!selectedTransaction?.paymentMonth) return undefined;
    const cycle = cycles.find((c) => c.id === selectedTransaction.paymentMonth);
    return cycle?.createdDate;
  };

  const handleMenuClick = (view: ViewState) => {
    setCurrentView(view);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleReconClick = () => {
    if (window.innerWidth >= 768) {
      // Desktop: Toggle sidebar instead of modal
      setIsRightSidebarOpen(!isRightSidebarOpen);
    } else {
      setIsReconciliationModalOpen(true);
      setIsSidebarOpen(false);
    }
  };

  const navigateToLedger = (cycleId: string) => {
    setCurrentView("ledger");
    setSelectedCycleId(cycleId);
  };

  return (
    // Changed min-h-screen to h-[100dvh] and added overflow-hidden to parent
    <div className="h-[100dvh] bg-slate-50 font-sans text-slate-900 flex overflow-hidden">
      {/* Mobile Backdrop Overlay (Left Sidebar) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR - Persistent on Desktop, Toggleable on Mobile */}
      <aside
        className={`fixed h-full z-40 left-0 top-0 w-64 bg-white border-r flex flex-col transition-transform duration-300 shadow-xl md:shadow-sm md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-white">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-3 shadow-md shadow-slate-900/20">
              <Bus className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              BusManager
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-2">
            Quản lý
          </div>

          <div
            onClick={() => handleMenuClick("ledger")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
              currentView === "ledger"
                ? "bg-slate-100 text-slate-900 border-slate-200 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
            }`}
          >
            <FileText
              size={20}
              className={currentView === "ledger" ? "text-slate-900" : ""}
              strokeWidth={2.5}
            />
            <span
              className={`text-sm ${
                currentView === "ledger" ? "font-bold" : "font-medium"
              }`}
            >
              Sổ thu chi
            </span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg cursor-pointer transition-all">
            <Calendar size={20} />
            <span className="font-medium text-sm">Lịch xe chạy</span>
          </div>

          <div
            onClick={handleReconClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent md:border-slate-200 ${
              isRightSidebarOpen
                ? "md:bg-slate-50 md:text-slate-900 md:font-bold"
                : "md:font-medium"
            }`}
          >
            <Wallet
              size={20}
              className={isRightSidebarOpen ? "md:text-slate-900" : ""}
            />
            <span className="font-medium text-sm">Đối soát</span>
          </div>

          <div
            onClick={() => handleMenuClick("payments")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
              currentView === "payments"
                ? "bg-slate-100 text-slate-900 border-slate-200 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
            }`}
          >
            <CreditCard
              size={20}
              className={currentView === "payments" ? "text-slate-900" : ""}
              strokeWidth={2.5}
            />
            <span
              className={`text-sm ${
                currentView === "payments" ? "font-bold" : "font-medium"
              }`}
            >
              Quản lý thanh toán
            </span>
          </div>

          <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6">
            Hệ thống
          </div>

          <div
            onClick={() => handleMenuClick("buses")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
              currentView === "buses"
                ? "bg-slate-100 text-slate-900 border-slate-200 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
            }`}
          >
            <Bus
              size={20}
              className={currentView === "buses" ? "text-slate-900" : ""}
            />
            <span
              className={`text-sm ${
                currentView === "buses" ? "font-bold" : "font-medium"
              }`}
            >
              Danh sách xe
            </span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg cursor-pointer transition-all">
            <Settings size={20} />
            <span className="font-medium text-sm">Cài đặt</span>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shadow-sm">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-none mb-1">
                Admin
              </span>
              <span className="text-xs text-slate-500 leading-none">
                Quản lý cấp cao
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT SIDEBAR (Desktop Only - Toggleable) */}
      <aside
        className={`fixed right-0 top-0 h-full w-[400px] bg-white z-30 hidden md:block transition-transform duration-300 ${
          isRightSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ReconciliationSheet
          isOpen={true}
          onClose={() => setIsRightSidebarOpen(false)}
          currentBalance={openBalance}
          monthLabel="Kỳ hiện tại (Chưa thanh toán)"
          month={new Date().getMonth() + 1}
          year={new Date().getFullYear()}
          variant="sidebar"
        />
      </aside>

      {/* Main Content - Adapts margin based on sidebar state */}
      {/* Added custom-scrollbar here to ensure internal scrolling */}
      <main
        className={`flex-1 w-full h-full overflow-y-auto transition-all duration-300 md:ml-64 ${
          isRightSidebarOpen ? "md:mr-[400px]" : "md:mr-0"
        } custom-scrollbar relative`}
      >
        {/* VIEW SWITCHING */}
        {currentView === "payments" ? (
          <div className="w-full p-4 md:p-6">
            <PaymentManager
              onNavigateToLedger={navigateToLedger}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onOpenCreateModal={() => {
                setSelectedCycleId(null);
                setEditingCycle(undefined);
                handleOpenPaymentModal();
              }}
            />
          </div>
        ) : currentView === "buses" ? (
          <div className="w-full p-4 md:p-6">
            <BusManager
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>
        ) : (
          /* LEDGER VIEW (DEFAULT) */
          <div className="w-full p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-slate-100 shadow-sm md:hidden"
                >
                  <Menu size={20} />
                </button>
                <div className="flex flex-col">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                    25F-002.19
                  </h1>
                  <div className="text-sm text-slate-500 font-normal flex flex-wrap items-center gap-2">
                    {getCurrentViewLabel()}
                    {selectedCycleId && (
                      <Badge status={TransactionStatus.PAID} />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex w-full md:w-auto gap-3 items-center md:self-auto">
                {(!selectedCycleId || isLatestCycle) && (
                  <>
                    {/* Added: Desktop Right Sidebar Toggle Button next to Create Payment */}
                    <button
                      onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                      className="hidden md:flex items-center justify-center p-2.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                      title={
                        isRightSidebarOpen ? "Ẩn đối soát" : "Hiện đối soát"
                      }
                    >
                      {isRightSidebarOpen ? (
                        <PanelRightClose size={20} />
                      ) : (
                        <PanelRightOpen size={20} />
                      )}
                    </button>

                    <Button
                      variant="primary"
                      size="md"
                      icon={
                        isLatestCycle ? (
                          <Edit size={16} />
                        ) : (
                          <CreditCard size={16} />
                        )
                      }
                      onClick={handleOpenPaymentModal}
                      className="rounded-full bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-200 text-white border-none text-sm flex-1 md:flex-none justify-center px-6"
                    >
                      {isLatestCycle ? "Sửa thanh toán" : "Tạo thanh toán"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats Cards - Current Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              <StatsCard
                title="Tổng dư (Kỳ đang chọn)"
                value={stats.totalRemaining}
                diff={diffTotal}
                icon={Wallet}
                variant="blue"
              />
              <StatsCard
                title="Dư sau chia (Kỳ đang chọn)"
                value={stats.splitByFour}
                diff={diffSplit}
                icon={PieChart}
                variant="indigo"
              />
            </div>

            {/* Action Bar - Optimized for Mobile */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 gap-4">
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm pl-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 md:flex items-center gap-3 w-full md:w-auto">
                {/* CYCLE PICKER WITH NAV */}
                <div className="col-span-2 md:col-span-1 flex items-center gap-2">
                  <button
                    onClick={handlePrevCycle}
                    disabled={isPrevDisabled}
                    className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all shrink-0"
                    title="Kỳ trước"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="relative flex-1 md:min-w-[240px]">
                    <button
                      onClick={() => setIsCyclePickerOpen(!isCyclePickerOpen)}
                      className="h-11 w-full px-5 bg-white border border-slate-200 rounded-full text-sm font-medium flex items-center justify-between gap-3 text-slate-600 shadow-sm hover:shadow-md hover:border-slate-300 hover:text-slate-900 transition-all"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Calendar
                          size={16}
                          className="text-slate-400 shrink-0"
                        />
                        <span className="truncate">
                          {selectedCycleId
                            ? `Kỳ ${selectedCycleId}`
                            : "Kỳ hiện tại (Mở)"}
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform shrink-0 text-slate-400 ${
                          isCyclePickerOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isCyclePickerOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsCyclePickerOpen(false)}
                        />
                        <div className="absolute top-full mt-1 right-0 w-full md:w-[320px] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500">
                            Chọn kỳ dữ liệu
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCycleId(null);
                              setIsCyclePickerOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                              !selectedCycleId
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-700"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">
                                Kỳ hiện tại
                              </span>
                              <span className="text-xs opacity-80">
                                Chưa chốt sổ (Đang hoạt động)
                              </span>
                            </div>
                            {!selectedCycleId && (
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            )}
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <div className="max-h-[300px] overflow-y-auto">
                            {cycles.map((cycle) => (
                              <button
                                key={cycle.id}
                                onClick={() => {
                                  setSelectedCycleId(cycle.id);
                                  setIsCyclePickerOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors border-l-2 ${
                                  selectedCycleId === cycle.id
                                    ? "border-blue-600 bg-slate-50"
                                    : "border-transparent"
                                }`}
                              >
                                <div className="flex flex-col overflow-hidden">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-800">
                                      {cycle.id}
                                    </span>
                                    <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500 whitespace-nowrap">
                                      {cycle.createdDate}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500 truncate">
                                    {cycle.note || "Không có ghi chú"}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded whitespace-nowrap ml-2">
                                  {getCycleAmountDisplay(cycle)}
                                </span>
                              </button>
                            ))}
                            {cycles.length === 0 && (
                              <div className="px-4 py-3 text-center text-xs text-slate-400 italic">
                                Chưa có lịch sử thanh toán
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleNextCycle}
                    disabled={!selectedCycleId}
                    className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all shrink-0"
                    title="Kỳ tiếp theo"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="md"
                  icon={<Download size={16} />}
                  onClick={handleExportExcel}
                  className="rounded-full border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all w-full justify-center md:w-auto h-11 px-6 text-sm"
                >
                  Xuất Excel
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Plus size={18} />}
                  onClick={handleAddTransaction}
                  disabled={!!selectedCycleId}
                  title={
                    selectedCycleId
                      ? "Chỉ thêm được vào kỳ hiện tại"
                      : "Thêm mới"
                  }
                  className="rounded-full bg-slate-900 hover:bg-slate-800 shadow-md text-white border-none transition-all w-full justify-center md:w-auto h-11 px-6 text-sm"
                >
                  Thêm sổ
                </Button>
              </div>
            </div>

            {/* Table Container - Removed Revenue and SharedExpense Columns */}
            <div className="rounded-lg border bg-white overflow-hidden shadow-sm flex flex-col min-h-[400px]">
              <div className="overflow-x-auto flex-1 w-full custom-scrollbar">
                <table className="w-full text-sm text-left whitespace-nowrap table-fixed min-w-[750px] md:min-w-[1000px]">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="h-12 px-2 align-middle w-[40px] md:w-[60px] text-center">
                        2 Xe
                      </th>
                      <th className="h-12 px-2 align-middle w-[100px] text-center">
                        Ngày
                      </th>
                      {/* REMOVED: Tổng thu & Chi chung */}
                      <th className="h-12 px-2 align-middle text-right font-bold w-[120px] hidden md:table-cell">
                        Tổng dư
                      </th>
                      <th className="h-12 px-2 align-middle text-right font-bold w-[120px] hidden md:table-cell">
                        Dư chia
                      </th>
                      <th className="h-12 px-2 align-middle text-right w-[120px] hidden md:table-cell">
                        Chi riêng
                      </th>
                      <th className="h-12 px-2 align-middle text-right font-bold w-[80px] md:w-[120px]">
                        Dư còn lại
                      </th>
                      <th className="h-12 px-2 align-middle text-center w-[100px] table-cell"></th>
                      <th className="h-12 px-2 md:px-4 align-middle md:w-[400px]">
                        Ghi chú
                      </th>
                      <th className="h-12 px-2 align-middle text-center w-[100px] md:w-[140px]">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-6 text-center text-muted-foreground"
                        >
                          Đang tải dữ liệu...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-10 text-center text-muted-foreground"
                        >
                          {isSearching
                            ? `Không tìm thấy dữ liệu nào cho "${searchTerm}"`
                            : `Không có dữ liệu nào trong kỳ này.`}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => handleOpenDetail(t)}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        >
                          <td className="px-2 py-3 align-middle text-center">
                            <input
                              title="Đi 2 xe"
                              type="checkbox"
                              checked={t.isShared}
                              disabled
                              className="w-3 h-3 md:w-4 md:h-4 rounded border-gray-300 text-slate-900 accent-slate-900 cursor-not-allowed disabled:opacity-100"
                            />
                          </td>
                          <td className="px-2 py-3 align-middle font-medium text-center text-slate-900 truncate">
                            {t.date}
                          </td>
                          {/* REMOVED: t.revenue & t.sharedExpense */}
                          <td className="px-2 py-3 align-middle text-right font-bold text-slate-900 hidden md:table-cell">
                            {formatCurrency(t.totalBalance)}
                          </td>
                          <td className="px-2 py-3 align-middle text-right font-bold text-slate-900 hidden md:table-cell">
                            {formatCurrency(t.splitBalance)}
                          </td>
                          <td className="px-2 py-3 align-middle text-right text-slate-600 hidden md:table-cell">
                            {formatCurrency(t.privateExpense)}
                          </td>
                          <td className="px-2 py-3 align-middle text-right font-bold text-slate-900">
                            {formatCurrency(t.remainingBalance)}
                          </td>
                          <td className="px-2 py-3 align-middle text-center table-cell">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(t);
                              }}
                              className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                            >
                              Chi tiết
                            </button>
                          </td>
                          <td
                            className="px-2 md:px-4 py-3 align-middle text-slate-600 truncate"
                            title={t.note}
                          >
                            {t.note}
                          </td>
                          <td className="px-2 py-3 align-middle text-center">
                            <Badge status={t.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t p-4 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-slate-500 gap-2">
                <div className="flex items-center gap-4">
                  <span className="font-medium italic">
                    * Dữ liệu hiển thị theo{" "}
                    {selectedCycleId
                      ? "Kỳ thanh toán đã chọn"
                      : "các khoản chưa thanh toán (Open Items)"}
                  </span>
                </div>
                <span>Hiển thị: {transactions.length} bản ghi</span>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-600 mb-4 flex items-center gap-2 uppercase">
                <Database size={20} className="text-slate-500" />
                Thống kê
              </h3>

              {/* UPDATED GRID LAYOUT AND COLORS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Toàn bộ - Tổng dư (Dark Green) */}
                <DarkStatsCard
                  title="Tổng xe dư"
                  value={globalStats.totalAll}
                  icon={CheckCircle}
                  colorClass="bg-[#044736]"
                  iconBgClass="bg-white/10"
                  iconColor="text-emerald-400"
                />

                {/* Card 2: Toàn bộ - Cổ phần (Dark Navy) */}
                <DarkStatsCard
                  title="Cổ phần"
                  value={globalStats.shareAll}
                  icon={PieChart}
                  colorClass="bg-[#131b2e]"
                  iconBgClass="bg-white/10"
                  iconColor="text-blue-400"
                />

                {/* Card 3: Năm nay - Tổng dư (Dark Purple) */}
                <DarkStatsCard
                  title="Dư năm nay"
                  value={globalStats.totalYear}
                  icon={Calendar}
                  colorClass="bg-[#2e1065]"
                  iconBgClass="bg-white/10"
                  iconColor="text-purple-400"
                />

                {/* Card 4: Năm nay - Cổ phần (Dark Gray/Black) */}
                <DarkStatsCard
                  title="Năm nay"
                  value={globalStats.shareYear}
                  icon={TrendingUp}
                  colorClass="bg-[#12151e]"
                  iconBgClass="bg-white/10"
                  iconColor="text-slate-400"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          onCheckExists={handleCheckExists}
          onSwitchToEdit={handleSwitchToEdit}
          paymentDate={getSelectedTransactionPaymentDate()}
        />
      )}

      {/* Payment Cycle Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        transactions={paymentModalTransactions}
        cycles={cycles}
        onConfirm={handleConfirmPayment}
        editingCycle={editingCycle}
      />

      {/* Reconciliation Sheet (Mobile Modal Mode) */}
      <ReconciliationSheet
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        currentBalance={openBalance}
        monthLabel="Kỳ hiện tại (Chưa thanh toán)"
        month={new Date().getMonth() + 1}
        year={new Date().getFullYear()}
        variant="modal"
      />
    </div>
  );
};

// COMPACT DARK STATS CARD (Horizontal Layout)
const DarkStatsCard = ({
  title,
  value,
  icon: Icon,
  colorClass,
  iconBgClass,
  iconColor,
}: any) => {
  const formattedValue = new Intl.NumberFormat("vi-VN").format(
    Math.round(value)
  );

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 transition-transform hover:scale-[1.01] duration-300 ${colorClass} text-white shadow-lg border border-white/5`}
    >
      {/* Background Icon Decoration - Smaller & Subtler */}
      <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] pointer-events-none rotate-12">
        <Icon size={80} />
      </div>

      {/* Compact Flex Row Layout */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">
            {title}
          </span>
          <div className="text-xl md:text-2xl font-bold tracking-tight">
            {formattedValue}
          </div>
        </div>

        <div
          className={`p-2.5 rounded-lg border border-white/10 backdrop-blur-sm ${iconBgClass} shrink-0 ml-3`}
        >
          <Icon size={20} className={iconColor || "text-white"} />
        </div>
      </div>
    </div>
  );
};
