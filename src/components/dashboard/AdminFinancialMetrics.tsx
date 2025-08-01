import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  ArrowUp,
} from "lucide-react";
import TimePeriodFilter, { TimePeriod } from "./TimePeriodFilter";
import SellerFilter from "./SellerFilter";
import {
  getTransactionsByMixedFilters,
  getTransactionsByPeriod,
} from "@/lib/api";
import {
  calculateTotalRevenue,
  calculateTotalProfit,
  calculateTotalCommission,
} from "@/lib/financialUtils";
import { Transaction } from "@/types/transactions";
import { formatCurrency, mapStatusToSpanish } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import "./dashboardStyles.css";

// Define chart colors matching the uploaded image
const CHART_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed"];

const AdminFinancialMetrics: React.FC = () => {
  const {
    transactions,
    loading: contextLoading,
    error: contextError,
  } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (transactions.length > 0) {
      fetchFilteredData();
    }
    // }, [timePeriod, selectedSellerId, transactions]);
    // }, [timePeriod, selectedSellerId]);
  }, []);

  const fetchFilteredData = async () => {
    try {
      setLoading(true);
      if (selectedSellerId === null && timePeriod === "all") {
        // Use transactions from context for "all" period with no seller filter
        setFilteredTransactions(transactions);
      } else if (selectedSellerId === null) {
        const response = await getTransactionsByPeriod(timePeriod);
        const data = response;
        setFilteredTransactions(Array.isArray(data) ? data : []);
      } else {
        const response = await getTransactionsByMixedFilters(
          timePeriod,
          selectedSellerId
        );
        const data = response;
        setFilteredTransactions(Array.isArray(data) ? data : []);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching filtered transactions:", err);
      setError("No se pudieron cargar las transacciones filtradas");
      // Fallback to context transactions
      setFilteredTransactions(transactions);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredDatav2 = async (timePeriod2: TimePeriod) => {
    try {
      setLoading(true);
      if (selectedSellerId === null && timePeriod2 === "all") {
        // Use transactions from context for "all" period with no seller filter
        setFilteredTransactions(transactions);
        setLoading(false);
      } else if (selectedSellerId === null) {
        const response = await getTransactionsByPeriod(timePeriod2);
        const data = response;
        setFilteredTransactions(Array.isArray(data) ? data : []);
        setLoading(false);
      } else {
        const response = await getTransactionsByMixedFilters(
          timePeriod2,
          selectedSellerId
        );
        const data = response;
        setFilteredTransactions(Array.isArray(data) ? data : []);
        setLoading(false);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching filtered transactions:", err);
      setError("No se pudieron cargar las transacciones filtradas");
      // Fallback to context transactions
      setFilteredTransactions(transactions);
    } finally {
      setLoading(false);
    }
  };

  // Use context transactions as fallback when no filtered data
  const displayTransactions =
    filteredTransactions.length > 0 ? filteredTransactions : transactions;

  // Calculate key metrics
  const totalRevenue = calculateTotalRevenue(displayTransactions);
  const totalProfit = calculateTotalProfit(totalRevenue);
  const totalCommission = calculateTotalCommission(displayTransactions);
  const totalSales = displayTransactions.length;

  // Prepare data for charts
  const prepareMonthlyData = () => {
    const monthlyData: {
      [key: string]: { month: string; revenue: number; sales: number };
    } = {};

    displayTransactions.forEach((transaction) => {
      const date = new Date(transaction.start_date);
      const monthYear = date.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { month: monthYear, revenue: 0, sales: 0 };
      }

      monthlyData[monthYear].revenue += transaction.amount;
      monthlyData[monthYear].sales += 1;
    });

    return Object.values(monthlyData).sort((a, b) => {
      return a.month.localeCompare(b.month);
    });
  };

  const prepareStatusData = () => {
    const statusCounts: { [key: string]: number } = {};

    displayTransactions.forEach((transaction) => {
      const status = transaction.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({
      name: mapStatusToSpanish(name),
      value,
    }));
  };

  const prepareSellerCommissionData = () => {
    const sellerCommissions: {
      [key: string]: { name: string; value: number };
    } = {};

    displayTransactions.forEach((transaction) => {
      const sellerName = transaction.seller_name || "Unknown";
      const commission = transaction.amount * 0.0225; // 2.25% commission

      if (!sellerCommissions[sellerName]) {
        sellerCommissions[sellerName] = { name: sellerName, value: 0 };
      }

      sellerCommissions[sellerName].value += commission;
    });

    return Object.values(sellerCommissions);
  };

  const monthlyData = prepareMonthlyData();
  const statusData = prepareStatusData();
  const commissionData = prepareSellerCommissionData();

  const handlePeriodChange = (period: TimePeriod) => {
    console.log("period", period);
    setTimePeriod(period);
    fetchFilteredDatav2(period);
  };

  const handleSellerChange = (sellerId: number | null) => {
    setSelectedSellerId(sellerId);
  };

  const isLoading = contextLoading && loading;
  const displayError = contextError || error;

  return (
    <Card className="bg-white border-blue-200 mb-6">
      {loading ? (
        <>
          <div className="flex justify-center py-6">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        </>
      ) : (
        <>
          <CardHeader className="pb-2 border-b border-blue-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-blue-700">
                Métricas de Ventas
              </CardTitle>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <SellerFilter
                  transactions={displayTransactions}
                  selectedSellerId={selectedSellerId}
                  onSellerChange={handleSellerChange}
                />
                <TimePeriodFilter
                  currentPeriod={timePeriod}
                  onPeriodChange={handlePeriodChange}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : displayError ? (
              <div className="text-center text-red-500 py-4">
                {displayError}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-white shadow-md border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Ingresos Totales
                        </h3>
                        <div className="p-2 bg-blue-500 text-white rounded-md">
                          <TrendingUp size={20} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {formatCurrency(totalRevenue)}
                      </div>
                      <div className="flex items-center mt-2 text-sm">
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500 font-medium">
                          +12.5%
                        </span>
                        <span className="text-gray-500 ml-1">
                          (vs mes anterior)
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-md border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Ganancia (15%)
                        </h3>
                        <div className="p-2 bg-green-500 text-white rounded-md">
                          <DollarSign size={20} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(totalProfit)}
                      </div>
                      <div className="flex items-center mt-2 text-sm">
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500 font-medium">
                          +5.1%
                        </span>
                        <span className="text-gray-500 ml-1">
                          (vs mes anterior)
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-md border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Comisión a Vendedores
                        </h3>
                        <div className="p-2 bg-purple-500 text-white rounded-md">
                          <Users size={20} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {formatCurrency(totalCommission)}
                      </div>
                      <div className="flex items-center mt-2 text-sm">
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500 font-medium">
                          +2.3%
                        </span>
                        <span className="text-gray-500 ml-1">
                          (vs mes anterior)
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-md border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Total Ventas
                        </h3>
                        <div className="p-2 bg-orange-500 text-white rounded-md">
                          <ShoppingBag size={20} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {totalSales}
                      </div>
                      <div className="flex items-center mt-2 text-sm">
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500 font-medium">
                          +8.2%
                        </span>
                        <span className="text-gray-500 ml-1">
                          (vs mes anterior)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Revenue Chart */}
                  <Card className="bg-white shadow-md border border-gray-200">
                    <CardHeader className="pb-2 border-b border-gray-200">
                      <CardTitle className="text-gray-700 text-lg">
                        Ingresos por período
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={monthlyData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                            />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis
                              tickFormatter={(value) => {
                                return new Intl.NumberFormat("es-CO", {
                                  notation: "compact",
                                  compactDisplay: "short",
                                  style: "currency",
                                  currency: "COP",
                                  maximumFractionDigits: 1,
                                }).format(value);
                              }}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                formatCurrency(value as number),
                                "Ingresos",
                              ]}
                              labelFormatter={(label) => `Periodo: ${label}`}
                            />
                            <Bar
                              dataKey="revenue"
                              fill="#2563eb"
                              name="Ingresos"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sales Status Distribution */}
                  <Card className="bg-white shadow-md border border-gray-200">
                    <CardHeader className="pb-2 border-b border-gray-200">
                      <CardTitle className="text-gray-700 text-lg">
                        Distribución de ventas por estado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 40 : 60}
                              outerRadius={isMobile ? 80 : 100}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {statusData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    CHART_COLORS[index % CHART_COLORS.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} />
                            <Tooltip
                              formatter={(value, name) => [
                                `${value} ventas`,
                                name,
                              ]}
                              labelFormatter={() => "Estado"}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Commission Distribution */}
                  <Card className="bg-white shadow-md border border-gray-200 lg:col-span-2">
                    <CardHeader className="pb-2 border-b border-gray-200">
                      <CardTitle className="text-gray-700 text-lg">
                        Distribución de comisiones por vendedor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={commissionData}
                            layout="vertical"
                            margin={{
                              top: 5,
                              right: 30,
                              left: isMobile ? 60 : 100,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                            />
                            <XAxis
                              type="number"
                              tickFormatter={(value) =>
                                formatCurrency(value, false)
                              }
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={80}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                formatCurrency(value as number),
                                "Comisión",
                              ]}
                              labelFormatter={(label) => `Vendedor: ${label}`}
                            />
                            <Bar
                              dataKey="value"
                              fill="#7c3aed"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
};

export default AdminFinancialMetrics;
