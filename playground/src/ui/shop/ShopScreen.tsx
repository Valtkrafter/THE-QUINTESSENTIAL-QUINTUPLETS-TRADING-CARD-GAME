import { useMemo, useState } from 'react';
import { cardById } from '../../cards/catalog';
import { FINISH_TIER } from '../../cards/finish';
import { dailyOffers, ShopError, buyOffer, stockLeft, type Offer } from '../../domain/kiosk';
import { sellCopies, sellableCopies } from '../../domain/selling';
import { findFinish } from '../../holo/finishes';
import { gameStore, useSave } from '../../state/app';
import { CardFace } from '../components/CardFace';
import { Button, Segmented } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { PageHeader } from '../components/PageHeader';
import { cx, formatYen } from '../format';
import { useToday } from '../hooks/useToday';
import { text } from '../text';
import styles from './Shop.module.css';

type Tab = 'buy' | 'sell';

function OfferTile({ offer, left, canAfford, onBuy }: { readonly offer: Offer; readonly left: number; readonly canAfford: boolean; readonly onBuy: () => void }) {
  const { card, price } = offer;
  return (
    <li className={cx(styles.offer, left === 0 && styles.soldOut)}>
      <span className={styles.face}>
        <CardFace card={card} finish="standard" interactive={false} live={false} />
      </span>
      <div className={styles.info}>
        <span className={styles.name}>{card.name.en}</span>
        <span className={styles.meta}>
          <span>{card.title}</span>
          <span>{card.rarity}</span>
        </span>
        <span className={styles.meta}>
          <span className={styles.price}>{formatYen(price)}</span>
          <span className={styles.stock}>{text.shop.kiosk.stock(left)}</span>
        </span>
      </div>
      <Button kind={left > 0 && canAfford ? 'primary' : 'default'} disabled={left === 0 || !canAfford} onClick={onBuy}>
        {left === 0 ? text.shop.kiosk.stock(0) : canAfford ? text.shop.kiosk.buy : text.shop.kiosk.short(price)}
      </Button>
    </li>
  );
}

function Kiosk() {
  const save = useSave();
  const today = useToday();
  const offers = useMemo(() => dailyOffers(today), [today]);
  const [message, setMessage] = useState<string | null>(null);

  const buy = (offer: Offer): void => {
    try {
      const purchase = gameStore.getState().transact((current) => {
        const bought = buyOffer(current, offer.card.id, today, Date.now());
        return { save: bought.save, value: bought };
      });
      setMessage(purchase === undefined ? null : text.shop.kiosk.bought(offer.card.name.en));
    } catch (error) {
      setMessage(error instanceof ShopError ? text.shop.kiosk.errors[error.code] : null);
    }
  };

  return (
    <>
      <p className={styles.note}>{text.shop.kiosk.note}</p>
      {message !== null && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
      <ul className={styles.grid} aria-label={text.shop.kiosk.title}>
        {offers.map((offer) => (
          <OfferTile key={offer.card.id} offer={offer} left={stockLeft(save, today, offer.card.id)} canAfford={save.player.yen >= offer.price} onBuy={() => buy(offer)} />
        ))}
      </ul>
    </>
  );
}

function Sell() {
  const save = useSave();
  const spare = useMemo(() => sellableCopies(save), [save]);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Copies that are no longer spare (for example after a sale) drop out of the selection by themselves.
  const chosen = spare.filter((option) => picked.has(option.copy.uid));
  const total = chosen.reduce((sum, option) => sum + option.price, 0);

  const toggle = (uid: string): void => {
    const next = new Set(picked);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    setPicked(next);
    setMessage(null);
  };

  const sell = (): void => {
    const uids = chosen.map((option) => option.copy.uid);
    try {
      const sale = gameStore.getState().transact((current) => {
        const result = sellCopies(current, uids, Date.now());
        return { save: result.save, value: result };
      });
      setMessage(sale === undefined ? null : text.shop.sell.sold(sale.sold, sale.yen));
      setPicked(new Set());
    } catch {
      setMessage(null);
    }
    setConfirming(false);
  };

  if (spare.length === 0) {
    return (
      <>
        <p className={styles.note}>{text.shop.sell.note}</p>
        {message !== null && <p className={styles.message}>{message}</p>}
        <p className={styles.empty}>{text.shop.sell.none}</p>
      </>
    );
  }

  return (
    <>
      <p className={styles.note}>{text.shop.sell.note}</p>
      {message !== null && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
      <div className={styles.toolbar}>
        <Button onClick={() => setPicked(new Set(spare.filter((option) => FINISH_TIER[option.copy.finish] === 'plain').map((option) => option.copy.uid)))}>{text.shop.sell.selectPlain}</Button>
        <Button onClick={() => setPicked(new Set(spare.map((option) => option.copy.uid)))}>{text.shop.sell.selectAll}</Button>
        <Button kind="quiet" onClick={() => setPicked(new Set())}>
          {text.shop.sell.clear}
        </Button>
      </div>
      <ul className={styles.grid}>
        {spare.map(({ copy, price }) => {
          const card = cardById(copy.cardId);
          return card === undefined ? null : (
            <li key={copy.uid}>
              <button
                type="button"
                className={styles.pick}
                aria-pressed={picked.has(copy.uid)}
                aria-label={`${card.name.en}, ${card.title}, ${findFinish(copy.finish).label}, ${formatYen(price)}`}
                onClick={() => toggle(copy.uid)}
              >
                <span className={styles.face}>
                  <CardFace card={card} finish={copy.finish} interactive={false} live={false} />
                </span>
                <span className={styles.worth}>{text.shop.sell.worth(price)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.sellBar}>
        <strong>{text.shop.sell.total(chosen.length, total)}</strong>
        <Button kind="primary" disabled={chosen.length === 0} onClick={() => setConfirming(true)}>
          {text.shop.sell.sell(chosen.length)}
        </Button>
      </div>
      {confirming && (
        <Dialog title={text.shop.sell.confirmTitle} onClose={() => setConfirming(false)}>
          <div className={styles.confirm}>
            <p>{text.shop.sell.confirm(chosen.length, total)}</p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setConfirming(false)}>{text.shop.sell.cancel}</Button>
              <Button kind="danger" onClick={sell}>
                {text.shop.sell.confirmYes}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

/** The shop: the Kiosk (buy single cards) and the buyer of spare cards. */
export default function ShopScreen() {
  const save = useSave();
  const [tab, setTab] = useState<Tab>('buy');
  return (
    <>
      <PageHeader
        title={text.shop.title}
        subtitle={text.shop.subtitle}
        actions={
          <div>
            <span>{text.shop.yen}</span> <strong>{formatYen(save.player.yen)}</strong>
          </div>
        }
      />
      <div className={styles.tabs}>
        <Segmented
          value={tab}
          onChange={setTab}
          label={text.shop.title}
          options={[
            { value: 'buy', label: text.shop.tabs.buy },
            { value: 'sell', label: text.shop.tabs.sell },
          ]}
        />
      </div>
      {tab === 'buy' ? <Kiosk /> : <Sell />}
    </>
  );
}
