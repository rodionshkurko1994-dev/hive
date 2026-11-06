import { getSession } from '@/lib/session';
import { saveProfile } from '@/app/actions';
import { DISTRICTS } from '@/lib/constants';
import Header from '@/components/Header';

export default async function OnboardingPage({ searchParams }) {
  const { profile, isAdmin } = await getSession({ requireOnboarded: false });
  const editing = profile?.onboarded;

  return (
    <>
      <Header profile={editing ? profile : null} isAdmin={isAdmin} />
      <main className="container" style={{ maxWidth: 680 }}>
        <div className="card stack" style={{ gap: 20, padding: 28 }}>
          <div className="stack" style={{ gap: 6 }}>
            <h1 className="display" style={{ margin: 0, fontSize: 26 }}>
              {editing ? 'Редагувати профіль' : 'Розкажи про себе'}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              Район потрібен, щоб показувати тобі сусідів і новини поруч. Точну адресу ніхто не бачить.
            </p>
          </div>
          {searchParams?.error && (
            <div className="alert alert-error" role="alert">Заповни ім'я та вибери район.</div>
          )}
          <form action={saveProfile} className="stack" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="full_name">Ім'я та прізвище *</label>
              <input id="full_name" name="full_name" className="input" required maxLength={80} defaultValue={profile?.full_name || ''} />
            </div>
            <div className="field">
              <label htmlFor="district">Район Києва *</label>
              <select id="district" name="district" className="select" required defaultValue={profile?.district || ''}>
                <option value="" disabled>Вибери район</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="neighborhood">Місцевість / мікрорайон</label>
              <input id="neighborhood" name="neighborhood" className="input" maxLength={80} placeholder="Напр., Позняки" defaultValue={profile?.neighborhood || ''} />
            </div>
            <div className="field">
              <label htmlFor="building">Будинок або ЖК</label>
              <input id="building" name="building" className="input" maxLength={120} placeholder="Напр., ЖК «Патріотика» або вул. Ахматової, 22" defaultValue={profile?.building || ''} />
              <span className="hint">Бачать лише зареєстровані сусіди.</span>
            </div>
            <div className="field">
              <label htmlFor="bio">Про себе</label>
              <textarea id="bio" name="bio" className="textarea" maxLength={600} defaultValue={profile?.bio || ''} />
            </div>
            <button type="submit" className="btn btn-honey">{editing ? 'Зберегти' : 'Увійти у вулик'}</button>
          </form>
        </div>
      </main>
    </>
  );
}
