import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppShell } from '@/components/layout';
import {
  PrimaryButton,
  ScrollPage,
  SectionHeading,
  StateMessage,
  useSurfaceStyles,
} from '@/components/shared';
import { AppIcon } from '@/components/shared/AppIcon';
import { useRemoteData } from '@/hooks/useRemoteData';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import {
  createVipCheckout,
  getSavedAuthUser,
  getSubscriptionPlans,
  getVipTransactions,
  type AuthUser,
  type VipCheckoutOrder,
  type VipPaymentMethod,
  type VipTransactionRecord,
} from '@/lib/api';

const VIP_BENEFITS = [
  {
    title: 'Không quảng cáo',
    desc: 'Tận hưởng âm nhạc liền mạch, không bao giờ bị ngắt quãng.',
  },
  {
    title: 'Chất lượng âm thanh 320kbps',
    desc: 'Âm thanh độ phân giải cao và chuẩn lossless vượt trội.',
  },
  {
    title: 'Tải nhạc không giới hạn',
    desc: 'Lưu bài hát yêu thích về máy và nghe ngoại tuyến mọi lúc.',
  },
  {
    title: 'Đồng bộ đa thiết bị',
    desc: 'Đăng nhập và phát nhạc đồng bộ trên Mobile, Web và Tablet.',
  },
];

const PAYMENT_METHODS: { id: VipPaymentMethod; name: string; icon: string }[] = [
  { id: 'momo', name: 'Ví MoMo', icon: 'M' },
  { id: 'zalopay', name: 'ZaloPay', icon: 'Z' },
  { id: 'vnpay', name: 'VNPAY-QR', icon: 'V' },
  { id: 'atm', name: 'Thẻ ATM nội địa', icon: 'A' },
  { id: 'card', name: 'Visa / MasterCard', icon: '💳' },
  { id: 'viettelpay', name: 'Viettel Money', icon: 'VT' },
  { id: 'shopeepay', name: 'ShopeePay', icon: 'S' },
];

function formatPrice(amount: number) {
  return amount.toLocaleString('vi-VN') + ' đ';
}

export function VipScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const surface = useSurfaceStyles();
  const router = useRouter();
  const [tab, setTab] = useState<'plans' | 'history'>('plans');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<VipPaymentMethod>('momo');
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderResult, setOrderResult] = useState<VipCheckoutOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  // Transactions state
  const [transactions, setTransactions] = useState<VipTransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    void getSavedAuthUser().then(setUser);
  }, []);

  const { data: plans, loading, error, reload } = useRemoteData(
    async () => (await getSubscriptionPlans()).data
  );

  // derived active plan below

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const res = await getVipTransactions();
      setTransactions(res.data);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Không thể tải lịch sử giao dịch.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTabChange = (nextTab: 'plans' | 'history') => {
    setTab(nextTab);
    if (nextTab === 'history') {
      void loadHistory();
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản Melodify để tiến hành mua gói VIP.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => router.push('/login' as never) },
        ]
      );
      return;
    }

    if (!activePlanId) {
      setCheckoutError('Vui lòng chọn một gói dịch vụ.');
      return;
    }

    setCheckingOut(true);
    setCheckoutError('');
    try {
      const response = await createVipCheckout(activePlanId, selectedMethod);
      setOrderResult(response.data);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Giao dịch không thành công.');
    } finally {
      setCheckingOut(false);
    }
  };

  const activePlanId = selectedPlanId || plans?.[0]?.id || "";
  const selectedPlan = plans?.find((p) => p.id === activePlanId);

  return (
    <AppShell>
      <ScrollPage>
        {/* Banner Header */}
        <View style={[styles.heroCard, surface.card]}>
          <View style={styles.crownCircle}>
            <AppIcon name="crown" color="#FFC40E" size={28} />
          </View>
          <Text style={styles.heroTitle}>Melodify VIP</Text>
          <Text style={styles.heroSubtitle}>
            Âm thanh chất lượng cao, không quảng cáo và nghe offline mọi nơi.
          </Text>
          {user ? (
            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>
                {user.is_premium ? '👑 Đã kích hoạt gói VIP' : '⭐ Tài khoản Miễn phí'}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/login' as never)}
              style={styles.loginHint}
            >
              <Text style={styles.loginHintText}>Đăng nhập để nhận ưu đãi VIP →</Text>
            </Pressable>
          )}
        </View>

        {/* Tab switch */}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => handleTabChange('plans')}
            style={[styles.tabBtn, tab === 'plans' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === 'plans' && styles.tabBtnTextActive]}>
              Gói dịch vụ
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabChange('history')}
            style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>
              Lịch sử giao dịch
            </Text>
          </Pressable>
        </View>

        {tab === 'plans' ? (
          <>
            {/* VIP Benefits */}
            <View style={styles.section}>
              <SectionHeading title="Đặc quyền thành viên VIP" />
              <View style={styles.benefitsGrid}>
                {VIP_BENEFITS.map((item) => (
                  <View key={item.title} style={[styles.benefitCard, surface.card]}>
                    <Text style={styles.benefitIcon}>✦</Text>
                    <View style={styles.benefitCopy}>
                      <Text style={styles.benefitTitle}>{item.title}</Text>
                      <Text style={styles.benefitDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Plans List */}
            <View style={styles.section}>
              <SectionHeading title="Chọn gói đăng ký" />
              {loading || error ? (
                <StateMessage
                  loading={loading}
                  error={error}
                  onRetry={() => void reload()}
                />
              ) : null}

              {plans?.map((plan) => {
                const isSelected = plan.id === activePlanId;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setSelectedPlanId(plan.id)}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardActive,
                      surface.card,
                    ]}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.planTitleWrap}>
                        <Text style={[styles.planName, isSelected && styles.planNameActive]}>
                          {plan.name}
                        </Text>
                        {plan.billing_cycle === 'yearly' ? (
                          <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeText}>Tiết kiệm nhất</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.planPrice, isSelected && styles.planPriceActive]}>
                        {formatPrice(plan.price)}
                      </Text>
                    </View>
                    {plan.description ? (
                      <Text style={styles.planDesc}>{plan.description}</Text>
                    ) : null}
                    <View style={styles.planPerks}>
                      <Text style={styles.planPerkText}>
                        ✓ Thời hạn: {plan.billing_months} tháng
                      </Text>
                      <Text style={styles.planPerkText}>
                        ✓ Chất lượng âm thanh cao cấp
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Payment Methods */}
            <View style={styles.section}>
              <SectionHeading title="Phương thức thanh toán" />
              <View style={styles.methodsGrid}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  return (
                    <Pressable
                      key={method.id}
                      onPress={() => setSelectedMethod(method.id)}
                      style={[
                        styles.methodCard,
                        isSelected && styles.methodCardActive,
                        surface.card,
                      ]}
                    >
                      <View
                        style={[
                          styles.methodIconBox,
                          isSelected && styles.methodIconBoxActive,
                        ]}
                      >
                        <Text style={styles.methodIconText}>{method.icon}</Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.methodName,
                          isSelected && styles.methodNameActive,
                        ]}
                      >
                        {method.name}
                      </Text>
                      {isSelected ? (
                        <Text style={styles.checkMark}>✓</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {checkoutError ? (
              <Text style={styles.errorText}>{checkoutError}</Text>
            ) : null}

            {/* Checkout Button */}
            <View style={styles.checkoutWrap}>
              <PrimaryButton
                disabled={checkingOut || !selectedPlan}
                label={
                  checkingOut
                    ? 'Đang tạo giao dịch…'
                    : selectedPlan
                    ? `Thanh toán ngay — ${formatPrice(selectedPlan.price)}`
                    : 'Chọn gói VIP'
                }
                onPress={() => void handleCheckout()}
              />
            </View>
          </>
        ) : (
          /* Transaction history tab */
          <View style={styles.section}>
            <SectionHeading title="Lịch sử giao dịch VIP" />
            {!user ? (
              <StateMessage empty="Vui lòng đăng nhập để xem lịch sử giao dịch." />
            ) : loadingHistory ? (
              <StateMessage loading />
            ) : historyError ? (
              <StateMessage error={historyError} onRetry={() => void loadHistory()} />
            ) : transactions.length === 0 ? (
              <StateMessage empty="Bạn chưa có giao dịch mua VIP nào." />
            ) : (
              <View style={styles.transactionsList}>
                {transactions.map((tx) => (
                  <View key={tx.id} style={[styles.txCard, surface.card]}>
                    <View style={styles.txHeader}>
                      <Text style={styles.txCode}>{tx.payment_code}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          tx.status === 'completed'
                            ? styles.statusSuccess
                            : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {tx.status === 'completed' ? 'Thành công' : 'Chờ xác nhận'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.txPlan}>{tx.plan_name}</Text>
                    <View style={styles.txFooter}>
                      <Text style={styles.txDate}>
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleDateString('vi-VN')
                          : 'Hôm nay'}
                      </Text>
                      <Text style={styles.txAmount}>{formatPrice(tx.amount)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Checkout Result Modal */}
        <Modal
          visible={Boolean(orderResult)}
          transparent
          animationType="fade"
          onRequestClose={() => setOrderResult(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalCrown}>
                <AppIcon name="crown" color="#FFC40E" size={32} />
              </View>
              <Text style={styles.modalTitle}>Tạo yêu cầu thành công!</Text>
              <Text style={styles.modalSub}>
                Giao dịch nâng cấp VIP của bạn đang chờ hệ thống xác nhận.
              </Text>

              <View style={styles.modalInfoBox}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Mã đơn hàng:</Text>
                  <Text style={styles.modalValueBold}>{orderResult?.payment_code}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Gói dịch vụ:</Text>
                  <Text style={styles.modalValue}>{orderResult?.plan.name}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Số tiền:</Text>
                  <Text style={styles.modalValueGold}>
                    {orderResult ? formatPrice(orderResult.amount) : ''}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Phương thức:</Text>
                  <Text style={styles.modalValue}>
                    {PAYMENT_METHODS.find((m) => m.id === orderResult?.method)?.name ||
                      orderResult?.method}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalNotice}>
                Sau khi xác nhận thanh toán, tài khoản của bạn sẽ tự động được nâng cấp lên VIP.
              </Text>

              <Pressable
                onPress={() => {
                  setOrderResult(null);
                  handleTabChange('history');
                }}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>Xem lịch sử đơn hàng</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollPage>
    </AppShell>
  );
}

const baseStyles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 20,
    backgroundColor: '#1E2825',
    borderWidth: 1,
    borderColor: '#364540',
    gap: 8,
    marginBottom: 8,
  },
  crownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 196, 14, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#F5F7F6',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: '#AEB8B3',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  userBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 211, 229, 0.15)',
    borderWidth: 1,
    borderColor: '#00D3E5',
  },
  userBadgeText: {
    color: '#00D3E5',
    fontSize: 12,
    fontWeight: '800',
  },
  loginHint: {
    marginTop: 6,
    paddingVertical: 4,
  },
  loginHintText: {
    color: '#00D3E5',
    fontSize: 13,
    fontWeight: '800',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#202A28',
    padding: 4,
    marginVertical: 10,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#00D3E5',
  },
  tabBtnText: {
    color: '#AEB8B3',
    fontSize: 13,
    fontWeight: '800',
  },
  tabBtnTextActive: {
    color: '#082326',
  },
  section: {
    gap: 10,
    marginVertical: 8,
  },
  benefitsGrid: {
    gap: 8,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#202A28',
    gap: 12,
  },
  benefitIcon: {
    color: '#00D3E5',
    fontSize: 18,
    fontWeight: '900',
  },
  benefitCopy: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    color: '#F5F7F6',
    fontSize: 13,
    fontWeight: '800',
  },
  benefitDesc: {
    color: '#9CA8A2',
    fontSize: 11,
    lineHeight: 16,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#202A28',
    borderWidth: 1.5,
    borderColor: '#35403C',
    gap: 6,
  },
  planCardActive: {
    borderColor: '#FFC40E',
    backgroundColor: '#242F2C',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    color: '#F5F7F6',
    fontSize: 16,
    fontWeight: '900',
  },
  planNameActive: {
    color: '#FFC40E',
  },
  saveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 196, 14, 0.2)',
  },
  saveBadgeText: {
    color: '#FFC40E',
    fontSize: 10,
    fontWeight: '800',
  },
  planPrice: {
    color: '#F5F7F6',
    fontSize: 17,
    fontWeight: '900',
  },
  planPriceActive: {
    color: '#FFC40E',
  },
  planDesc: {
    color: '#AEB8B3',
    fontSize: 12,
  },
  planPerks: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  planPerkText: {
    color: '#9CA8A2',
    fontSize: 11,
    fontWeight: '600',
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#202A28',
    borderWidth: 1.5,
    borderColor: '#35403C',
    gap: 8,
  },
  methodCardActive: {
    borderColor: '#00D3E5',
    backgroundColor: '#203332',
  },
  methodIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2F3C37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconBoxActive: {
    backgroundColor: '#00D3E5',
  },
  methodIconText: {
    color: '#F5F7F6',
    fontSize: 12,
    fontWeight: '900',
  },
  methodName: {
    flex: 1,
    color: '#F5F7F6',
    fontSize: 12,
    fontWeight: '700',
  },
  methodNameActive: {
    color: '#00D3E5',
  },
  checkMark: {
    color: '#00D3E5',
    fontSize: 14,
    fontWeight: '900',
  },
  checkoutWrap: {
    marginTop: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 4,
  },
  transactionsList: {
    gap: 8,
  },
  txCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#202A28',
    gap: 6,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txCode: {
    color: '#00D3E5',
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusSuccess: {
    backgroundColor: 'rgba(84, 221, 165, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 196, 14, 0.2)',
  },
  statusText: {
    color: '#F5F7F6',
    fontSize: 10,
    fontWeight: '800',
  },
  txPlan: {
    color: '#F5F7F6',
    fontSize: 14,
    fontWeight: '800',
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  txDate: {
    color: '#8F9994',
    fontSize: 11,
  },
  txAmount: {
    color: '#FFC40E',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E2724',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#35433E',
  },
  modalCrown: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 196, 14, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#F5F7F6',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSub: {
    color: '#AEB8B3',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalInfoBox: {
    width: '100%',
    backgroundColor: '#151C1A',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginVertical: 4,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    color: '#8F9994',
    fontSize: 12,
  },
  modalValue: {
    color: '#F5F7F6',
    fontSize: 12,
    fontWeight: '700',
  },
  modalValueBold: {
    color: '#00D3E5',
    fontSize: 13,
    fontWeight: '900',
  },
  modalValueGold: {
    color: '#FFC40E',
    fontSize: 13,
    fontWeight: '900',
  },
  modalNotice: {
    color: '#8F9994',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalBtn: {
    width: '100%',
    minHeight: 44,
    backgroundColor: '#00D3E5',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalBtnText: {
    color: '#082326',
    fontSize: 14,
    fontWeight: '900',
  },
});
